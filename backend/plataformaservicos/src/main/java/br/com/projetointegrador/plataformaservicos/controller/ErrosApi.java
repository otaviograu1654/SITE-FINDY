// Transforma erros de validação e acesso em mensagens JSON para as telas.

package br.com.projetointegrador.plataformaservicos.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class ErrosApi {
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> tamanhoFoto(MaxUploadSizeExceededException erro) {
        return ResponseEntity.status(413).body(Map.of("mensagem", "A foto deve ter até 2 MB."));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> status(ResponseStatusException erro) {
        String mensagem = erro.getReason() == null ? "Operacao nao permitida." : erro.getReason();
        return ResponseEntity.status(erro.getStatusCode()).body(Map.of("mensagem", mensagem));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> validacao(MethodArgumentNotValidException erro) {
        String mensagem = erro.getBindingResult().getFieldErrors().stream()
                .map(campo -> campo.getField() + ": " + campo.getDefaultMessage())
                .distinct().collect(Collectors.joining("; "));
        return ResponseEntity.badRequest().body(Map.of("mensagem", mensagem));
    }
}
