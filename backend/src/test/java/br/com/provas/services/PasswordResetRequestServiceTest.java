package br.com.provas.services;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.Optional;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;

import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;

import br.com.provas.dtos.auth.ForgotPasswordRequest;

class PasswordResetRequestServiceTest {

    private final PasswordResetService resetService = mock(PasswordResetService.class);
    private final PasswordResetMailService mailService = mock(PasswordResetMailService.class);
    private final ForgotPasswordRequest request = new ForgotPasswordRequest("ana@example.test");

    @Test
    void queuesWorkWithoutLookingUpAccountOnRequestThread() {
        Executor executor = mock(Executor.class);
        new PasswordResetRequestService(executor, resetService, mailService).requestReset(request);
        verify(executor).execute(any(Runnable.class));
        verifyNoInteractions(resetService, mailService);
    }

    @Test
    void deliversOnlyAfterTokenIssuanceReturns() {
        when(resetService.requestReset(request)).thenReturn(Optional.of(
                new PasswordResetService.ResetDelivery(request.email(), "test-token")));
        new PasswordResetRequestService(Runnable::run, resetService, mailService).requestReset(request);
        var ordered = inOrder(resetService, mailService);
        ordered.verify(resetService).requestReset(request);
        ordered.verify(mailService).sendPasswordReset(request.email(), "test-token");
    }

    @Test
    void hidesProviderFailureFromPublicEndpoint() {
        when(resetService.requestReset(request)).thenReturn(Optional.of(
                new PasswordResetService.ResetDelivery(request.email(), "test-token")));
        doThrow(new MailSendException("provider error")).when(mailService).sendPasswordReset(any(), any());
        assertDoesNotThrow(() -> new PasswordResetRequestService(Runnable::run, resetService, mailService).requestReset(request));
    }

    @Test
    void handlesQueueSaturationWithoutLookingUpAccount() {
        Executor executor = task -> { throw new RejectedExecutionException(); };
        assertDoesNotThrow(() -> new PasswordResetRequestService(executor, resetService, mailService).requestReset(request));
        verifyNoInteractions(resetService, mailService);
    }
}
