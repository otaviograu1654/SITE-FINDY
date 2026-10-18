// Representa o perfil profissional e sua aprovação na tabela de prestadores.

package br.com.projetointegrador.plataformaservicos.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "prestadores")
public class Prestador {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "usuario_id", nullable = false, unique = true)
    private Usuario usuario;

    @Column(name = "descricao_profissional", columnDefinition = "text")
    private String descricaoProfissional;
    @Column(columnDefinition = "text")
    private String experiencia;
    @Column(name = "regiao_atendimento", length = 255)
    private String regiaoAtendimento;
    @Column(name = "status_aprovacao", nullable = false, length = 20)
    private String statusAprovacao = "PENDENTE";
    @Column(name = "motivo_recusa", columnDefinition = "text")
    private String motivoRecusa;
    @Column(name = "analisado_por")
    private Long analisadoPor;
    @Column(name = "data_analise")
    private OffsetDateTime dataAnalise;
    @Column(nullable = false)
    private boolean ativo = true;
    @Column(name = "data_cadastro", nullable = false, updatable = false)
    private OffsetDateTime dataCadastro = OffsetDateTime.now();

    public Long getId() { return id; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public String getDescricaoProfissional() { return descricaoProfissional; }
    public void setDescricaoProfissional(String valor) { descricaoProfissional = valor; }
    public String getExperiencia() { return experiencia; }
    public void setExperiencia(String valor) { experiencia = valor; }
    public String getRegiaoAtendimento() { return regiaoAtendimento; }
    public void setRegiaoAtendimento(String valor) { regiaoAtendimento = valor; }
    public String getStatusAprovacao() { return statusAprovacao; }
    public String getMotivoRecusa() { return motivoRecusa; }
    public OffsetDateTime getDataAnalise() { return dataAnalise; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }

    public void solicitarAnalise() {
        statusAprovacao = "PENDENTE";
        motivoRecusa = null;
        analisadoPor = null;
        dataAnalise = null;
    }
}
