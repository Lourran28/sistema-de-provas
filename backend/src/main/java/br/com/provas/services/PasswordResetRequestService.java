package br.com.provas.services;

import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import br.com.provas.dtos.auth.ForgotPasswordRequest;

@Service
public class PasswordResetRequestService {

    private static final Logger LOGGER = LoggerFactory.getLogger(PasswordResetRequestService.class);
    private final Executor executor;
    private final PasswordResetService resetService;
    private final PasswordResetMailService mailService;

    public PasswordResetRequestService(
            @Qualifier("passwordResetExecutor") Executor executor,
            PasswordResetService resetService,
            PasswordResetMailService mailService) {
        this.executor = executor;
        this.resetService = resetService;
        this.mailService = mailService;
    }

    public void requestReset(ForgotPasswordRequest request) {
        try {
            // Even unknown addresses are processed off-thread, with the same HTTP response.
            executor.execute(() -> {
                try {
                    // The transaction commits before SMTP starts; no DB lock waits on email.
                    resetService.requestReset(request).ifPresent(delivery ->
                            mailService.sendPasswordReset(delivery.recipient(), delivery.token()));
                } catch (RuntimeException exception) {
                    // Provider messages can contain recipients, credentials or reset URLs.
                    LOGGER.error("Password reset delivery failed ({}). Check mail and database configuration.",
                            exception.getClass().getSimpleName());
                }
            });
        } catch (RejectedExecutionException exception) {
            LOGGER.warn("Password reset queue is full or shutting down; request not queued.");
        }
    }
}
