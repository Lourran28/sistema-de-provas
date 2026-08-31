package br.com.provas.security;

import java.util.UUID;

import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import br.com.provas.repositories.UserRepository;

@Service
public class UserPrincipalService {

    private final UserRepository userRepository;

    public UserPrincipalService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserPrincipal loadById(UUID userId) {
        return userRepository.findById(userId)
                .map(UserPrincipal::from)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado."));
    }
}
