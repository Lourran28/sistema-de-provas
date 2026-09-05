package br.com.provas.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import br.com.provas.dtos.auth.ForgotPasswordRequest;
import br.com.provas.dtos.auth.LoginRequest;
import br.com.provas.dtos.auth.ResetPasswordRequest;
import br.com.provas.entities.PasswordResetTokenEntity;
import br.com.provas.entities.UserEntity;
import br.com.provas.entities.UserRole;
import br.com.provas.repositories.PasswordResetTokenRepository;
import br.com.provas.repositories.UserRepository;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:password-reset;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.security.jwt.secret=isolated-integration-test-secret-at-least-32-characters",
        "app.frontend-url=https://provas.example.test", "app.mail.from=provas@example.test"
})
@AutoConfigureMockMvc
class PasswordResetIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository users;
    @Autowired private PasswordResetTokenRepository tokens;
    @Autowired private PasswordResetService resets;
    @Autowired private AuthenticationService auth;
    @Autowired private PasswordEncoder encoder;
    @MockitoBean private JavaMailSender mailSender;

    private BlockingQueue<SimpleMailMessage> messages;

    @BeforeEach
    void captureMailWithoutSendingToRealRecipients() {
        messages = new LinkedBlockingQueue<>();
        doAnswer(call -> {
            messages.add(new SimpleMailMessage(call.getArgument(0, SimpleMailMessage.class)));
            return null;
        }).when(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void completesPublicRecoveryAndRejectsOldPasswordSessionAndReusedLink() throws Exception {
        UserEntity user = newUser();
        String oldSession = auth.login(new LoginRequest(user.getEmail(), "old-password")).accessToken();
        mvc.perform(post("/api/auth/password/forgot")
                .header("Authorization", "Bearer expired-or-invalid-session")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(new ForgotPasswordRequest(user.getEmail()))))
                .andExpect(status().isNoContent());

        SimpleMailMessage mail = messages.poll(10, TimeUnit.SECONDS);
        assertNotNull(mail, "The worker must generate a reset email");
        assertArrayEquals(new String[] {user.getEmail()}, mail.getTo());
        var matcher = Pattern.compile("#token=([A-Za-z0-9_-]{43})").matcher(mail.getText());
        assertTrue(matcher.find());
        String rawToken = matcher.group(1);
        assertTrue(tokens.findByTokenHash(hash(rawToken)).isPresent(), "Token must commit before delivery");
        assertTrue(tokens.findByTokenHash(rawToken).isEmpty());

        mvc.perform(post("/api/auth/password/reset")
                .header("Authorization", "Bearer expired-or-invalid-session")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(new ResetPasswordRequest(rawToken, "new-password"))))
                .andExpect(status().isNoContent());
        assertEquals(0, tokens.findByTokenHash(hash(rawToken)).stream().count());

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + oldSession))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(new LoginRequest(user.getEmail(), "old-password"))))
                .andExpect(status().isUnauthorized());
        String freshSession = auth.login(new LoginRequest(user.getEmail(), "new-password")).accessToken();
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + freshSession))
                .andExpect(status().isOk());
        assertEquals(400, resetStatus(rawToken, "another-password"));
    }

    @Test
    void onlyOneConcurrentResetCanConsumeTheSameToken() throws Exception {
        UserEntity user = newUser();
        String rawToken = resets.requestReset(new ForgotPasswordRequest(user.getEmail())).orElseThrow().token();
        CountDownLatch start = new CountDownLatch(1);
        try (var workers = Executors.newFixedThreadPool(2)) {
            var first = workers.submit(() -> { start.await(); return resetStatus(rawToken, "first-password"); });
            var second = workers.submit(() -> { start.await(); return resetStatus(rawToken, "second-password"); });
            start.countDown();
            var statuses = List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS));
            assertEquals(1, statuses.stream().filter(code -> code == 204).count());
            assertEquals(1, statuses.stream().filter(code -> code == 400).count());
        }
        assertEquals(1, users.findById(user.getId()).orElseThrow().getCredentialVersion());
    }

    @Test
    void concurrentRequestsRespectAccountCooldown() throws Exception {
        UserEntity user = newUser();
        var request = new ForgotPasswordRequest(user.getEmail());
        CountDownLatch start = new CountDownLatch(1);
        try (var workers = Executors.newFixedThreadPool(2)) {
            var first = workers.submit(() -> { start.await(); return resets.requestReset(request); });
            var second = workers.submit(() -> { start.await(); return resets.requestReset(request); });
            start.countDown();
            int issued = (first.get(20, TimeUnit.SECONDS).isPresent() ? 1 : 0)
                    + (second.get(20, TimeUnit.SECONDS).isPresent() ? 1 : 0);
            assertEquals(1, issued);
        }
    }

    @Test
    void passwordChangeInvalidatesOutstandingResetLinkAndSession() throws Exception {
        UserEntity user = newUser();
        String session = auth.login(new LoginRequest(user.getEmail(), "old-password")).accessToken();
        String token = resets.requestReset(new ForgotPasswordRequest(user.getEmail())).orElseThrow().token();
        mvc.perform(patch("/api/auth/me/password").header("Authorization", "Bearer " + session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"old-password\",\"newPassword\":\"new-password\"}"))
                .andExpect(status().isNoContent());
        assertEquals(400, resetStatus(token, "another-password"));
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + session))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void changingEmailInvalidatesLinkSentToOldAddress() throws Exception {
        UserEntity user = newUser();
        String session = auth.login(new LoginRequest(user.getEmail(), "old-password")).accessToken();
        String token = resets.requestReset(new ForgotPasswordRequest(user.getEmail())).orElseThrow().token();
        mvc.perform(patch("/api/auth/me").header("Authorization", "Bearer " + session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Ana\",\"email\":\"" + UUID.randomUUID() + "@example.test\"}"))
                .andExpect(status().isOk());
        assertEquals(400, resetStatus(token, "another-password"));
    }

    @Test
    void rejectsExpiredTokensAndInvalidPasswordsWithoutConsumingValidLink() throws Exception {
        UserEntity user = newUser();
        String expired = "expired-" + UUID.randomUUID();
        tokens.saveAndFlush(new PasswordResetTokenEntity(user, hash(expired),
                Instant.now().minusSeconds(1), Instant.now().minusSeconds(901)));
        assertEquals(400, resetStatus(expired, "new-password"));
        String valid = resets.requestReset(new ForgotPasswordRequest(user.getEmail())).orElseThrow().token();
        assertEquals(400, resetStatus(valid, "short"));
        assertEquals(400, resetStatus(valid, "old-password"));
        assertEquals(400, resetStatus(valid, "\u00e9".repeat(37)));
        assertEquals(204, resetStatus(valid, "new-password"));
    }

    private UserEntity newUser() {
        return users.saveAndFlush(new UserEntity("Ana", UUID.randomUUID() + "@example.test",
                encoder.encode("old-password"), UserRole.TEACHER));
    }

    private int resetStatus(String token, String password) throws Exception {
        return mvc.perform(post("/api/auth/password/reset").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(new ResetPasswordRequest(token, password))))
                .andReturn().getResponse().getStatus();
    }

    private String hash(String value) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    }
}
