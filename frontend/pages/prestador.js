// Sem ID: cadastro guiado. Com ID: consulta exclusivamente pública.
(() => {
 const {api,mensagem,enviar,foto}=Findy, $=id=>document.getElementById(id);
 const form=$('prestador-form'), campo=n=>form.elements.namedItem(n), aviso=$('prestador-mensagem');
 const submit=form.querySelector('[type="submit"]'), id=new URLSearchParams(location.search).get('id');
 let perfil=null,pessoa=null,etapa=0,previa=null,ocupado=false;
 const rotulos={PENDENTE:'Aguardando análise',APROVADO:'Aprovado',RECUSADO:'Recusado anteriormente: corrija e reenvie',CORRECAO_SOLICITADA:'Correção solicitada',RECUSADO_DEFINITIVO:'Recusado definitivamente'};
 function p(destino,valor){const el=document.createElement('p');el.textContent=valor;destino.append(el);}
 function lista(destino,itens){destino.replaceChildren();for(const valor of itens||[]){const li=document.createElement('li');li.textContent=valor;destino.append(li);}}
 function servicos(destino,itens,limpar=true){
  if(limpar)destino.replaceChildren();if(!itens?.length)p(destino,'Nenhum serviço cadastrado.');
  for(const s of itens||[]){
   const moeda=v=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
   const valor=s.preco==null?'Orçamento a combinar':`Referência: ${moeda(s.preco)}${s.preco_maximo==null?'':` a ${moeda(s.preco_maximo)}`} — valor final a combinar`;
   p(destino,`${s.titulo} — ${s.categoria} — ${valor} (${s.unidade_cobranca})${s.ativo?'':' — desativado'}`);
   if(id!==null&&s.ativo){const link=document.createElement('a');link.href=`contratacao.html?servico=${s.id}`;link.className='btn-black perfil-link';link.textContent=`Solicitar ${s.titulo}`;destino.append(link);}
  }
 }
 function apresentar(d){
  $('prestador-nome').textContent=d.nome;$('prestador-foto').src=foto(d.foto);
  $('prestador-local').textContent=[d.bairro,d.cidade,d.estado].filter(Boolean).join(', ');
  $('prestador-descricao').textContent=d.descricaoProfissional||'Preencha seu cadastro para oferecer serviços.';
  $('prestador-experiencia').textContent=d.iniciante?`Estou começando agora. ${d.experiencia||''}`:d.experiencia||'Não informada.';
  lista($('prestador-habilidades'),d.habilidades);servicos($('prestador-servicos'),d.servicos);
 }
 document.addEventListener('findy:perfil-atualizado',evento=>{
  if(id!==null||!pessoa)return;
  pessoa={...pessoa,...evento.detail};
  for(const n of ['nome','telefone','bairro','cidade','estado'])campo(n).value=pessoa[n]||'';
  if(!$('cadastro-foto').files.length)$('cadastro-foto-previa').src=foto(pessoa.foto);
  apresentar({...perfil,...pessoa});if(etapa===2)revisar();
 });
 function situacao(){
  $('prestador-status').textContent=perfil?`${rotulos[perfil.statusAprovacao]}${perfil.ativo?'':' (desativado)'}`:'Perfil ainda não enviado';
  $('prestador-motivo').hidden=!perfil?.motivoRecusa;$('prestador-motivo').textContent=perfil?.motivoRecusa||'';
  const definitivo=perfil?.statusAprovacao==='RECUSADO_DEFINITIVO';form.hidden=definitivo;
  $('prestador-ativacao').hidden=!perfil||definitivo;
  $('prestador-ativacao').textContent=perfil?.ativo?'Desativar perfil profissional':'Reativar e enviar para análise';
  $('prestador-publico').hidden=!(perfil?.ativo&&perfil.statusAprovacao==='APROVADO');
  if(perfil)$('prestador-publico').href=`perfil-prestador.html?id=${perfil.id}`;
  const publicacao=$('prestador-publicacao');
  const faltas=[];
  if(!perfil)faltas.push('Envie o cadastro profissional para análise.');
  else{
   if(perfil.statusAprovacao!=='APROVADO')faltas.push(`Situação: ${rotulos[perfil.statusAprovacao]}.`);
   if(!perfil.ativo)faltas.push('Seu perfil profissional está desativado.');
   if(!perfil.servicos?.some(s=>s.ativo))faltas.push('Cadastre pelo menos um serviço ativo em Meus serviços, escolhendo a categoria em que deseja aparecer.');
  }
  publicacao.textContent=faltas.length?faltas.join(' '):'Você tem perfil aprovado e serviço ativo. Suas ofertas aparecem nas categorias escolhidas em Meus serviços.';
  const h=$('prestador-historico');h.replaceChildren();if(!perfil?.historico?.length)p(h,'Ainda não há decisões registradas.');
  for(const a of perfil?.historico||[])p(h,`${new Date(a.data_analise).toLocaleString('pt-BR')} — ${rotulos[a.decisao]} — ${a.administrador}${a.motivo?': '+a.motivo:''}`);
 }
 function habilidades(){return [...form.querySelectorAll('[name="habilidades"]:checked')].map(el=>el.value);}
 function validar(){
  for(const el of form.querySelector(`[data-etapa="${etapa}"]`).querySelectorAll('input,textarea'))if(!el.checkValidity()){el.reportValidity();return false;}
  if(etapa===0){
   if(!/^[0-9]{10,13}$/.test(campo('telefone').value.replace(/\D/g,'')))throw Error('Informe telefone com DDD.');
   if(!pessoa.foto&&!$('cadastro-foto').files.length)throw Error('Selecione uma foto para enviar à análise.');
  }
  if(etapa===1&&!habilidades().length)throw Error('Marque pelo menos uma habilidade.');return true;
 }
 function revisar(){
  const pub=$('cadastro-revisao');pub.replaceChildren();
  const img=document.createElement('img');img.className='cadastro-avatar';img.alt='Foto da prévia pública';img.src=$('cadastro-foto-previa').src;pub.append(img);
  p(pub,campo('nome').value);p(pub,['bairro','cidade','estado'].map(n=>campo(n).value).join(', '));p(pub,campo('descricaoProfissional').value);
  if(campo('iniciante').checked)p(pub,'Estou começando agora');p(pub,campo('experiencia').value);
  for(const h of habilidades())p(pub,h);servicos(pub,perfil?.servicos?.filter(s=>s.ativo),false);
  const priv=$('cadastro-reservado');priv.replaceChildren();p(priv,`Telefone: ${campo('telefone').value} | E-mail: ${campo('email').value}`);p(priv,`Região atendida: ${campo('regiaoAtendimento').value}`);
 }
 function mostrarEtapa(){
  form.querySelectorAll('[data-etapa]').forEach((el,i)=>{el.hidden=i!==etapa;});
  document.querySelectorAll('.cadastro-progresso li').forEach((el,i)=>{if(i===etapa)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
  $('cadastro-voltar').hidden=etapa===0;$('cadastro-avancar').hidden=etapa===2;submit.hidden=etapa!==2;if(etapa===2)revisar();
  const l=form.querySelector(`[data-etapa="${etapa}"] legend`);l.tabIndex=-1;l.focus();
 }
 $('cadastro-avancar').onclick=()=>{try{if(validar()){etapa++;mostrarEtapa();mensagem(aviso,'');}}catch(e){mensagem(aviso,e.message,true);}};
 $('cadastro-voltar').onclick=()=>{etapa--;mostrarEtapa();};campo('estado').oninput=e=>{e.target.value=e.target.value.toUpperCase();};
 function exemplo(){const novo=campo('iniciante').checked;campo('experiencia').required=!novo;
  $('cadastro-exemplo').textContent=novo?'Exemplo: Estou começando como pedreiro. Aprendi ajudando minha família em reformas e faço reboco e pequenos reparos.':'Exemplo: Trabalho como pedreiro há dois anos. Faço reboco, assento pisos e procuro manter o ambiente organizado.';
 }
 campo('iniciante').onchange=exemplo;
 function liberar(){if(previa)URL.revokeObjectURL(previa);previa=null;}
 $('cadastro-foto').onchange=()=>{liberar();const arq=$('cadastro-foto').files[0];
  if(arq&&(!['image/jpeg','image/png'].includes(arq.type)||arq.size>2097152)){
   $('cadastro-foto').value='';$('cadastro-foto-previa').src=foto(pessoa.foto);return mensagem(aviso,'Selecione JPG ou PNG de até 2 MB.',true);
  }
  if(arq)previa=URL.createObjectURL(arq);$('cadastro-foto-previa').src=previa||foto(pessoa.foto);
 };window.addEventListener('pagehide',liberar);
 form.onsubmit=async e=>{
  e.preventDefault();if(etapa!==2||ocupado)return;ocupado=true;
  const els=[...form.querySelectorAll('input,textarea,button')];els.forEach(el=>{el.disabled=true;});
  try{
   const arq=$('cadastro-foto').files[0];
   if(arq){const dados=new FormData();dados.append('foto',arq);const res=await api('/fotos/me',{method:'POST',body:dados});pessoa.foto=res.foto;$('cadastro-foto').value='';liberar();$('cadastro-foto-previa').src=foto(pessoa.foto);}
   const pessoal=Object.fromEntries(['nome','telefone','bairro','cidade','estado'].map(n=>[n,campo(n).value.trim()]));
   const trabalho=Object.fromEntries(['descricaoProfissional','experiencia','regiaoAtendimento'].map(n=>[n,campo(n).value.trim()]));
   trabalho.iniciante=campo('iniciante').checked;trabalho.habilidades=habilidades();
   perfil=await api('/prestadores/me/cadastro',{method:'PUT',body:{pessoa:pessoal,trabalho}});
   pessoa={...pessoa,...pessoal};apresentar({...pessoa,...perfil});situacao();
   document.dispatchEvent(new CustomEvent('findy:perfil-atualizado',{detail:pessoa}));
   mensagem(aviso,'Cadastro salvo e enviado à análise. Cadastre suas ofertas em Meus serviços.');etapa=0;mostrarEtapa();
  }catch(e){mensagem(aviso,e.message,true);}finally{ocupado=false;els.forEach(el=>{el.disabled=false;});}
 };
 $('prestador-ativacao').onclick=()=>enviar($('prestador-ativacao'),async()=>{
  try{perfil=await api('/prestadores/me/ativacao',{method:'PATCH',body:{ativo:!perfil.ativo}});situacao();mensagem(aviso,'Situação atualizada.');}catch(e){mensagem(aviso,e.message,true);}
 });
 (async()=>{try{
  if(id!==null){if(!/^[0-9]+$/.test(id))throw Error('Perfil não encontrado.');apresentar(await api(`/prestadores/${id}`));$('prestador-apresentacao').hidden=false;}
  else{
   const [conta,usuario,catalogo]=await Promise.all([api('/perfil'),api('/auth/me'),api('/prestadores/habilidades')]);pessoa=conta;
   try{perfil=await api('/prestadores/me');}catch(e){if(e.status!==404)throw e;}
   for(const n of ['nome','telefone','bairro','cidade','estado'])campo(n).value=pessoa[n]||'';campo('email').value=usuario.email;
   for(const n of ['descricaoProfissional','experiencia','regiaoAtendimento'])campo(n).value=perfil?.[n]||'';
   campo('iniciante').checked=!!perfil?.iniciante;$('cadastro-foto-previa').src=foto(pessoa.foto);
   for(const [categoria,itens] of Object.entries(catalogo)){
    const grupo=document.createElement('details'),titulo=document.createElement('summary');titulo.textContent=categoria;grupo.append(titulo);
    for(const h of itens){const label=document.createElement('label');label.className='servico-checkbox';const input=document.createElement('input');input.type='checkbox';input.name='habilidades';input.value=`${categoria}: ${h}`;input.checked=perfil?.habilidades?.includes(input.value)||false;if(input.checked)grupo.open=true;label.append(input,document.createTextNode(h));grupo.append(label);}
    $('cadastro-habilidades').append(grupo);
   }
   apresentar({...pessoa,...perfil});situacao();exemplo();$('prestador-editor').hidden=false;$('prestador-situacao').hidden=false;$('cadastro-avancar').disabled=false;submit.disabled=false;
  }
  $('prestador-conteudo').hidden=false;mensagem(aviso,'');
 }catch(e){if(id===null&&e.status===401)return location.replace('login.html');mensagem(aviso,e.message,true);}})();
})();
