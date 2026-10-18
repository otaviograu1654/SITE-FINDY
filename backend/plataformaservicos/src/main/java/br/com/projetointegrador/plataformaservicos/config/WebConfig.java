package br.com.projetointegrador.plataformaservicos.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Desenvolvimento local com Live Server; a aplicacao tambem serve as telas na porta 8080.
        for (String rota : new String[]{  "/auth/**",
        "/usuarios",
        "/perfil",
        "/prestadores/**",
        "/admin/**",
        "/servicos"})
         {
            registry.addMapping(rota)
                    .allowedOrigins("http://localhost:5501", "http://127.0.0.1:5501")
                    .allowedMethods("GET", "POST", "PUT", "PATCH", "OPTIONS")
                    .allowedHeaders("Content-Type")
                    .allowCredentials(true);
        }
    }
}
