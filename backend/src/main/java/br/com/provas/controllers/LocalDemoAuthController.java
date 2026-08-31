package br.com.provas.controllers;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.provas.dtos.auth.AuthResponse;
import br.com.provas.services.AuthenticationService;

@Profile("local")
@RestController
@RequestMapping("/api/auth")
public class LocalDemoAuthController {

    private final AuthenticationService authenticationService;

    public LocalDemoAuthController(AuthenticationService authenticationService) {
        this.authenticationService = authenticationService;
    }

    @PostMapping("/demo")
    public AuthResponse loginDemo() {
        return authenticationService.loginLocalDemo();
    }
}
