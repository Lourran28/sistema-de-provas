package br.com.provas.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class PasswordResetMailService {

    private final JavaMailSender mailSender;
    private final String from;
    private final String frontendUrl;

    public PasswordResetMailService(
            JavaMailSender mailSender,
            @Value("${app.mail.from}") String from,
            @Value("${app.frontend-url}") String frontendUrl) {
        this.mailSender = mailSender;
        this.from = from;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    public void sendPasswordReset(String recipient, String token) {
        String resetUrl = frontendUrl + "/redefinir-senha?token=" + token;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(recipient);
        message.setSubject("Redefinição de senha - Sistema de Provas");
        message.setText("""
                Recebemos uma solicitação para redefinir a senha da sua conta.

                Acesse o link abaixo para criar uma nova senha:
                %s

                Este link expira em 15 minutos e só pode ser usado uma vez.
                Se você não fez esta solicitação, ignore este e-mail.
                """.formatted(resetUrl));
        mailSender.send(message);
    }
}
