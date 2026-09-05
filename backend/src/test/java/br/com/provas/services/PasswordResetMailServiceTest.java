package br.com.provas.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

class PasswordResetMailServiceTest {

    @Test
    void sendsCorrectSenderAndFragmentLink() {
        JavaMailSender sender = mock(JavaMailSender.class);
        new PasswordResetMailService(sender, "provas@example.test", "https://provas.example.test/")
                .sendPasswordReset("ana@example.test", "safe-token");
        var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender).send(message.capture());
        assertEquals("provas@example.test", message.getValue().getFrom());
        assertArrayEquals(new String[] { "ana@example.test" }, message.getValue().getTo());
        assertTrue(message.getValue().getText().contains("https://provas.example.test/redefinir-senha#token=safe-token"));
        assertFalse(message.getValue().getText().contains("?token="));
    }

    @Test
    void rejectsUnsafeFrontendUrlsButAllowsLocalDevelopment() {
        JavaMailSender sender = mock(JavaMailSender.class);
        for (String url : new String[] { "http://example.test", "https://user:pass@example.test", "https://example.test?next=x", "https://example.test#x", "javascript:alert(1)" }) {
            assertThrows(IllegalArgumentException.class, () -> new PasswordResetMailService(sender, "from@example.test", url));
        }
        assertDoesNotThrow(() -> new PasswordResetMailService(sender, "from@example.test", "http://localhost:5173"));
    }
}
