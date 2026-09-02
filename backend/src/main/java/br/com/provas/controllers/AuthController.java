package br.com.provas.controllers;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.provas.dtos.auth.AuthResponse;
import br.com.provas.dtos.auth.ChangePasswordRequest;
import br.com.provas.dtos.auth.LoginRequest;
import br.com.provas.dtos.auth.RegisterRequest;
import br.com.provas.dtos.auth.UserProfileResponse;
import br.com.provas.dtos.auth.UpdateProfileRequest;
import br.com.provas.security.UserPrincipal;
import br.com.provas.services.AuthenticationService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationService authenticationService;

    public AuthController(AuthenticationService authenticationService) {
        this.authenticationService = authenticationService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authenticationService.register(request));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authenticationService.login(request);
    }

    @GetMapping("/me")
    public UserProfileResponse getProfile(@AuthenticationPrincipal UserPrincipal principal) {
        return authenticationService.getProfile(principal.id());
    }

    @PatchMapping("/me")
    public UserProfileResponse updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest request) {
        return authenticationService.updateProfile(principal.id(), request);
    }

    @PatchMapping("/me/password")
    public ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request) {
        authenticationService.changePassword(principal.id(), request);
        return ResponseEntity.noContent().build();
    }
}
