package br.com.provas.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import br.com.provas.dtos.auth.AuthResponse;
import br.com.provas.dtos.auth.ChangePasswordRequest;
import br.com.provas.dtos.auth.LoginRequest;
import br.com.provas.dtos.auth.RegisterRequest;
import br.com.provas.dtos.auth.UpdateProfileRequest;
import br.com.provas.entities.UserEntity;
import br.com.provas.entities.UserRole;
import br.com.provas.exceptions.ConflictException;
import br.com.provas.repositories.UserRepository;
import br.com.provas.security.JwtService;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthenticationService authenticationService;

    @Test
    void registersTeacherWithNormalizedEmailAndHashedPassword() {
        RegisterRequest request = new RegisterRequest("  Ana   Souza ", "ANA@Escola.com ", "senha-segura");
        when(userRepository.existsByEmailIgnoreCase("ana@escola.com")).thenReturn(false);
        when(passwordEncoder.encode("senha-segura")).thenReturn("hash-seguro");
        when(jwtService.createToken(any(), eq("ana@escola.com"), eq(UserRole.TEACHER)))
                .thenReturn(new JwtService.TokenData("token", Instant.parse("2026-08-26T15:00:00Z")));

        AuthResponse response = authenticationService.register(request);

        ArgumentCaptor<UserEntity> userCaptor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).saveAndFlush(userCaptor.capture());
        assertEquals("Ana Souza", userCaptor.getValue().getName());
        assertEquals("ana@escola.com", userCaptor.getValue().getEmail());
        assertEquals("hash-seguro", userCaptor.getValue().getPasswordHash());
        assertEquals(UserRole.TEACHER, userCaptor.getValue().getRole());
        assertEquals("token", response.accessToken());
    }

    @Test
    void rejectsDuplicateEmailDuringRegistration() {
        when(userRepository.existsByEmailIgnoreCase("ana@escola.com")).thenReturn(true);

        assertThrows(
                ConflictException.class,
                () -> authenticationService.register(new RegisterRequest("Ana", "ana@escola.com", "senha-segura")));
    }

    @Test
    void rejectsLoginWithInvalidPassword() {
        UserEntity user = new UserEntity("Ana", "ana@escola.com", "hash-seguro", UserRole.TEACHER);
        when(userRepository.findByEmailIgnoreCase("ana@escola.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("senha-errada", "hash-seguro")).thenReturn(false);

        assertThrows(
                BadCredentialsException.class,
                () -> authenticationService.login(new LoginRequest("ana@escola.com", "senha-errada")));
    }

    @Test
    void createsASeparateLocalDemoAccountWhenItDoesNotExist() {
        when(userRepository.findByEmailIgnoreCase("demonstracao@provas.local")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hash-da-demonstracao");
        when(userRepository.saveAndFlush(any(UserEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtService.createToken(any(), eq("demonstracao@provas.local"), eq(UserRole.TEACHER)))
                .thenReturn(new JwtService.TokenData("token-demo", Instant.parse("2026-08-27T15:00:00Z")));

        AuthResponse response = authenticationService.loginLocalDemo();

        ArgumentCaptor<UserEntity> userCaptor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).saveAndFlush(userCaptor.capture());
        assertEquals("Demonstração local", userCaptor.getValue().getName());
        assertEquals("demonstracao@provas.local", userCaptor.getValue().getEmail());
        assertEquals("token-demo", response.accessToken());
    }

    @Test
    void updatesProfileWithNormalizedValues() {
        UserEntity user = new UserEntity("Ana", "ana@escola.com", "hash-seguro", UserRole.TEACHER);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.findByEmailIgnoreCase("ana.souza@escola.com")).thenReturn(Optional.empty());

        var response = authenticationService.updateProfile(
                user.getId(),
                new UpdateProfileRequest(" Ana   Souza ", " ANA.SOUZA@Escola.com "));

        assertEquals("Ana Souza", response.name());
        assertEquals("ana.souza@escola.com", response.email());
        assertEquals("Ana Souza", user.getName());
        assertEquals("ana.souza@escola.com", user.getEmail());
    }

    @Test
    void rejectsAnotherAccountEmailDuringProfileUpdate() {
        UserEntity user = new UserEntity("Ana", "ana@escola.com", "hash-seguro", UserRole.TEACHER);
        UserEntity otherUser = new UserEntity("Beatriz", "bia@escola.com", "hash-seguro", UserRole.TEACHER);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.findByEmailIgnoreCase("bia@escola.com")).thenReturn(Optional.of(otherUser));

        assertThrows(
                ConflictException.class,
                () -> authenticationService.updateProfile(user.getId(), new UpdateProfileRequest("Ana", "bia@escola.com")));
    }

    @Test
    void changesPasswordWhenCurrentPasswordIsValid() {
        UserEntity user = new UserEntity("Ana", "ana@escola.com", "hash-atual", UserRole.TEACHER);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("senha-atual", "hash-atual")).thenReturn(true);
        when(passwordEncoder.matches("senha-nova", "hash-atual")).thenReturn(false);
        when(passwordEncoder.encode("senha-nova")).thenReturn("hash-novo");

        authenticationService.changePassword(
                user.getId(),
                new ChangePasswordRequest("senha-atual", "senha-nova"));

        assertEquals("hash-novo", user.getPasswordHash());
    }

    @Test
    void rejectsPasswordChangeWhenCurrentPasswordIsWrong() {
        UserEntity user = new UserEntity("Ana", "ana@escola.com", "hash-atual", UserRole.TEACHER);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("senha-errada", "hash-atual")).thenReturn(false);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> authenticationService.changePassword(
                        user.getId(),
                        new ChangePasswordRequest("senha-errada", "senha-nova")));

        assertEquals("A senha atual está incorreta.", exception.getMessage());
        assertEquals("hash-atual", user.getPasswordHash());
    }
}
