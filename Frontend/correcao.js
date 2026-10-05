/* Lógica compartilhada: correcao.html (desktop) e correcao-mobile.html.
   Depende de app.js (objeto DB). Campos assumidos:
   DB.provas, DB.versoes{prova_id}, DB.turmas, DB.alunos{turma_id},
   DB.aplicacoes{id,prova_id,versao_id,aluno_id,data,status,nota} (criado se não existir). */
(function () {
  const MOBILE = document.body.dataset.mobile === '1';
  const q = s => document.querySelector(s);
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const persist = () => { if (typeof save === 'function') save(); else if (typeof salvar === 'function') salvar(); };
  const fmt = n => (n == null ? '—' : Number(n).toFixed(1).replace('.', ','));
  const fmtData = d => (d ? d.split('-').reverse().join('/') : '—');

  DB.aplicacoes = DB.aplicacoes || [];
  DB.alunos = DB.alunos || [];
  let filtro = new URLSearchParams(location.search).get('status') || '';
  let alvo = null; // aplicação selecionada para receber a nota do scanner

  const aluno = id => DB.alunos.find(a => a.id == id);
  const prova = id => DB.provas.find(p => p.id == id);
  const versao = id => DB.versoes.find(v => v.id == id);
  const turma = id => DB.turmas.find(t => t.id == id);

  function msg(tipo, texto) {
    const e = q('#err'), o = q('#okb');
    e.style.display = o.style.display = 'none';
    const box = tipo === 'err' ? e : o;
    box.textContent = texto; box.style.display = 'block';
    if (tipo === 'ok') setTimeout(() => (box.style.display = 'none'), 3500);
  }

  function preencherForm() {
    const ps = DB.provas.filter(p => DB.versoes.some(v => v.prova_id == p.id));
    q('#ap').innerHTML = ps.map(p => `<option value="${p.id}">${h(p.nome)} (${DB.versoes.filter(v => v.prova_id == p.id).length} versões)</option>`).join('') || '<option value="">Nenhuma prova montada</option>';
    q('#at').innerHTML = DB.turmas.map(t => `<option value="${t.id}">${t.ano}º ano · ${h(t.disciplina)}</option>`).join('') || '<option value="">Nenhuma turma</option>';
    preencherAlunos();
    if (!q('#ad').value) q('#ad').value = new Date().toISOString().slice(0, 10);
  }

  function preencherAlunos() {
    const lista = DB.alunos.filter(a => a.turma_id == q('#at').value);
    q('#aa').innerHTML = '<option value="">Turma inteira (' + lista.length + ' alunos)</option>' + lista.map(a => `<option value="${a.id}">${h(a.nome)}</option>`).join('');
  }

  function aplicar() {
    const pid = q('#ap').value, tid = q('#at').value, aid = q('#aa').value, data = q('#ad').value;
    if (!pid) return msg('err', 'Monte uma prova antes de aplicar.');
    if (!tid) return msg('err', 'Cadastre uma turma antes de aplicar.');
    if (!data) return msg('err', 'Informe a data da aplicação.');
    const alunos = aid ? DB.alunos.filter(a => a.id == aid) : DB.alunos.filter(a => a.turma_id == tid);
    if (!alunos.length) return msg('err', 'Esta turma não tem alunos.');
    const vs = DB.versoes.filter(v => v.prova_id == pid);
    // sorteia a primeira versão e distribui em sequência, para vizinhos não receberem a mesma
    const inicio = Math.floor(Math.random() * vs.length);
    let criadas = 0;
    alunos.forEach((a, i) => {
      if (DB.aplicacoes.some(x => x.prova_id == pid && x.aluno_id == a.id && x.data === data)) return;
      DB.aplicacoes.push({ id: Date.now() + i, prova_id: pid, versao_id: vs[(inicio + i) % vs.length].id, aluno_id: a.id, data, status: 'aplicada', nota: null });
      criadas++;
    });
    persist(); render();
    msg(criadas ? 'ok' : 'err', criadas ? `${criadas} avaliação(ões) criada(s).` : 'Essas avaliações já existem para esta data.');
  }

  function render() {
    const todas = DB.aplicacoes.slice().sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    const nAp = todas.filter(x => x.status === 'aplicada').length;
    q('#resumo').textContent = todas.length ? `${todas.length} avaliações · ${nAp} aguardando correção · ${todas.length - nAp} corrigidas` : 'Nenhuma prova aplicada ainda.';
    q('#tabs').innerHTML = [['', 'Todas'], ['aplicada', 'Aguardando'], ['corrigida', 'Corrigidas']]
      .map(([v, t]) => `<button type="button" class="tab${filtro === v ? ' active' : ''}" data-s="${v}">${t}</button>`).join('');
    const lista = todas.filter(x => !filtro || x.status === filtro);
    const vazio = '<div class="empty-note">Nada por aqui. Aplique uma prova para começar.</div>';

    if (MOBILE) {
      q('#tb').innerHTML = lista.map(x => {
        const a = aluno(x.aluno_id), v = versao(x.versao_id), p = prova(x.prova_id);
        return `<article class="ap-card${alvo == x.id ? ' sel' : ''}">
          <div class="ap-top"><strong>${h(a ? a.nome : 'Aluno removido')}</strong><span class="ap-nota">${fmt(x.nota)}</span></div>
          <div class="ap-meta">${h(p ? p.nome : '—')} · versão ${h(v ? (v.nome || v.letra || v.id) : '—')}</div>
          <div class="ap-meta">${fmtData(x.data)} · ${x.status === 'corrigida' ? 'Corrigida' : 'Aguardando'}</div>
          <button type="button" class="btn-generate" data-corrigir="${x.id}">${x.status === 'corrigida' ? 'Corrigir de novo' : 'Corrigir com a câmera'}</button>
        </article>`;
      }).join('') || vazio;
    } else {
      q('#tb').innerHTML = lista.map(x => {
        const a = aluno(x.aluno_id), v = versao(x.versao_id), p = prova(x.prova_id);
        return `<tr class="${alvo == x.id ? 'sel' : ''}">
          <td>${h(a ? a.nome : 'Aluno removido')}</td>
          <td>${h(p ? p.nome : '—')} / ${h(v ? (v.nome || v.letra || v.id) : '—')}</td>
          <td>${fmtData(x.data)}</td>
          <td>${x.status === 'corrigida' ? 'Corrigida' : 'Aguardando'}</td>
          <td class="num">${fmt(x.nota)}</td>
          <td><button type="button" class="btn-generate" data-corrigir="${x.id}">Corrigir</button></td></tr>`;
      }).join('') || `<tr><td colspan="6">${vazio}</td></tr>`;
    }
    const aviso = q('#alvo');
    if (aviso) {
      const a = alvo && DB.aplicacoes.find(x => x.id == alvo);
      aviso.innerHTML = a ? `Nota será salva para <strong>${h((aluno(a.aluno_id) || {}).nome || '—')}</strong>. <button type="button" id="limpar" class="link-btn">Limpar</button>` : 'Selecione um aluno na lista para salvar a nota automaticamente, ou use só como conferência.';
    }
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('.tab'), c = e.target.closest('[data-corrigir]');
    if (t) { filtro = t.dataset.s; render(); }
    if (c) { alvo = c.dataset.corrigir; render(); const m = q('#scanMount'); if (m) m.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (e.target.id === 'limpar') { alvo = null; render(); }
  });

  document.addEventListener('omr:resultado', e => {
    const a = alvo && DB.aplicacoes.find(x => x.id == alvo);
    if (!a) return;
    a.nota = e.detail.nota; a.status = 'corrigida';
    persist(); alvo = null; render();
    msg('ok', 'Nota salva na avaliação.');
  });

  q('#at').addEventListener('change', preencherAlunos);
  q('#apl').addEventListener('click', aplicar);
  preencherForm(); render();
})();
