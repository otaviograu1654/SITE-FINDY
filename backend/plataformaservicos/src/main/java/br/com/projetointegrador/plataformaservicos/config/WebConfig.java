// Configura o acesso do frontend à API e a execução dos envios de recuperação em segundo plano.

package br.com.projetointegrador.plataformaservicos.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableAsync
public class WebConfig implements WebMvcConfigurer {

    @Bean("recuperacaoExecutor")
    public ThreadPoolTaskExecutor recuperacaoExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("recuperacao-");
        return executor;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        for (String rota : new String[]{
                "/auth/**",
                "/usuarios",
                "/perfil",
                "/prestadores/**",
                "/admin/**",
                "/servicos",
                "/meus-servicos/**",
                "/fotos/**"
        }) {
            registry.addMapping(rota)
                    .allowedOrigins(
                            "http://localhost:5501",
                            "http://127.0.0.1:5501"
                    )
                    .allowedMethods(
                            "GET", "POST", "PUT", "PATCH", "OPTIONS"
                    )
                    .allowedHeaders("Content-Type")
                    .allowCredentials(true);
        }
    }
}
