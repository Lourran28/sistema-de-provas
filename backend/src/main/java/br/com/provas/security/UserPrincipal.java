package br.com.provas.security;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import br.com.provas.entities.UserEntity;
import br.com.provas.entities.UserRole;

public record UserPrincipal(UUID id, String name, String email, UserRole role) {

    public static UserPrincipal from(UserEntity user) {
        return new UserPrincipal(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }

    public List<GrantedAuthority> authorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
}
