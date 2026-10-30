package br.com.projetointegrador.plataformaservicos.service;

import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Service
public class CadastroProfissionalService {
    private final JdbcTemplate banco;
    public CadastroProfissionalService(JdbcTemplate banco) { this.banco = banco; }
    public static final Map<String,List<String>> CATALOGO = catalogo();
    private static Map<String,List<String>> catalogo() {
        Map<String,List<String>> c = new LinkedHashMap<>();
        c.put("Serviços Domésticos", List.of("Limpeza residencial", "Organização de ambientes", "Passar roupas", "Limpeza pós-obra"));
        c.put("Eventos", List.of("Decoração", "Buffet", "Fotografia", "Organização de eventos"));
        c.put("Infantil", List.of("Cuidados com crianças", "Recreação", "Auxílio escolar"));
        c.put("Serviços Gerais", List.of("Jardinagem", "Montagem de móveis", "Pequenos reparos", "Pintura"));
        c.put("Construção Civil", List.of("Tirar nível", "Assentar piso", "Levantar paredes", "Fazer reboco", "Encanamento"));
        c.put("Marketing e Vendas", List.of("Redes sociais", "Criação de anúncios", "Atendimento ao cliente", "Vendas"));
        c.put("Tecnologia e Design", List.of("Manutenção de computadores", "Criação de sites", "Design gráfico", "Suporte técnico"));
        return Collections.unmodifiableMap(c);
    }
    public void validarHabilidades(List<String> habilidades) {
        if (habilidades == null || habilidades.isEmpty() || habilidades.size()>40)
            throw erro("Marque pelo menos uma habilidade (máximo de 40).");
        Set<String> validas = new HashSet<>();
        CATALOGO.forEach((categoria,itens) -> itens.forEach(h -> validas.add(categoria + ": " + h)));
        if (new HashSet<>(habilidades).size()!=habilidades.size() || !validas.containsAll(habilidades))
            throw erro("Selecione habilidades válidas do catálogo.");
    }
    public void exigirCompleto(Long usuarioId) {
        Integer completos = banco.queryForObject("""
            SELECT COUNT(*) FROM usuarios WHERE id=? AND ativo
            AND LENGTH(TRIM(nome))>0 AND LENGTH(TRIM(email))>0
            AND LENGTH(REGEXP_REPLACE(COALESCE(telefone,''),'[^0-9]','','g')) BETWEEN 10 AND 13
            AND LENGTH(TRIM(cidade))>0 AND estado ~ '^[A-Z]{2}$'
            AND LENGTH(TRIM(bairro))>0
            AND (foto ~ '^https?://' OR (split_part(foto,'?',1)='/fotos/' || id
                AND EXISTS(SELECT 1 FROM fotos_usuarios f WHERE f.usuario_id=usuarios.id)))
            """,Integer.class,usuarioId);
        if (completos == null || completos == 0)
            throw erro("Preencha nome, telefone válido, bairro, cidade, UF e foto antes de enviar ? análise.");
    }
    public Map<String,Object> perfil(Long id, boolean publico) {
        List<Map<String,Object>> linhas = banco.queryForList("""
            SELECT p.id, p.descricao_profissional AS "descricaoProfissional", p.experiencia,
            p.regiao_atendimento AS "regiaoAtendimento", p.iniciante,
            u.nome,u.foto,u.bairro,u.cidade,u.estado,
            p.ativo,p.status_aprovacao AS "statusAprovacao",
            p.motivo_recusa AS "motivoRecusa",p.data_analise AS "dataAnalise"
            FROM prestadores p JOIN usuarios u ON u.id=p.usuario_id WHERE p.id=?
            """ + (publico ? " AND p.ativo AND u.ativo AND p.status_aprovacao='APROVADO'" : ""),id);
        if (linhas.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Perfil não encontrado.");
        Map<String,Object> resultado = linhas.getFirst();
        resultado.put("habilidades", banco.queryForList("SELECT habilidade FROM prestador_habilidades WHERE prestador_id=? ORDER BY habilidade",String.class,id));
        resultado.put("servicos",banco.queryForList("""
            SELECT s.id,s.titulo,s.descricao,s.preco,s.preco_maximo,s.unidade_cobranca,c.nome AS categoria,s.ativo
            FROM servicos s JOIN categorias c ON c.id=s.categoria_id
            WHERE s.prestador_id=?
            """ + (publico ? " AND s.ativo" : "") + " ORDER BY s.id",id));
        if (publico) {
            // Região ? texto livre privado: a localização pública usa apenas campos estruturados.
            for (String campo : List.of("regiaoAtendimento","ativo","statusAprovacao","motivoRecusa","dataAnalise")) resultado.remove(campo);
        } else resultado.put("historico", historico(id));
        return resultado;
    }
    public List<Map<String,Object>> historico(Long id) {
        return banco.queryForList("""
            SELECT a.decisao,a.motivo,a.data_analise,u.nome AS administrador
            FROM analises_prestadores a JOIN usuarios u ON u.id=a.administrador_id
            WHERE a.prestador_id=? ORDER BY a.data_analise DESC,a.id DESC
            """,id);
    }
    public void impedirRecusaDefinitiva(Long id) {
        if (Boolean.TRUE.equals(banco.queryForObject("SELECT status_aprovacao='RECUSADO_DEFINITIVO' FROM prestadores WHERE id=?",Boolean.class,id)))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Perfil recusado definitivamente. Sua conta continua disponível para contratar.");
    }
    public static ResponseStatusException erro(String mensagem) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,mensagem); }
}
