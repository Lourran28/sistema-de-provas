package br.com.provas.controllers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;

import org.mockito.Mockito;

import br.com.provas.config.SecurityConfig;
import br.com.provas.security.JwtService;
import br.com.provas.security.UserPrincipalService;
import br.com.provas.services.AuthenticationService;

@WebMvcTest({ HealthController.class, AuthController.class })
@Import({ SecurityConfig.class, HealthControllerTest.TestSecurityDependencies.class })
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuthenticationService authenticationService;

    @Test
    void healthEndpointIsPublic() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.service").value("backend"));
    }

    @Test
    void loginEndpointIsPublic() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void profileEndpointRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void invalidCredentialsReturnUnauthorized() throws Exception {
        when(authenticationService.login(any()))
                .thenThrow(new BadCredentialsException("E-mail ou senha inválidos."));

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"professor@escola.com\",\"password\":\"senha-segura\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @TestConfiguration
    static class TestSecurityDependencies {

        @Bean
        JwtService jwtService() {
            return Mockito.mock(JwtService.class);
        }

        @Bean
        UserPrincipalService userPrincipalService() {
            return Mockito.mock(UserPrincipalService.class);
        }

        @Bean
        AuthenticationService authenticationService() {
            return Mockito.mock(AuthenticationService.class);
        }
    }
}
