package br.com.provas.repositories;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.provas.entities.PasswordResetTokenEntity;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, UUID> {

    Optional<PasswordResetTokenEntity> findByTokenHash(String tokenHash);

    Optional<PasswordResetTokenEntity> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);

    void deleteByUserId(UUID userId);
}
