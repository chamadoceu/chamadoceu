(function(){
  'use strict';

  const byId = (id) => document.getElementById(id);
  const qsAll = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const firstEl = (ids) => ids.map(byId).find(Boolean);

  const LS = {
    insumos: 'va_insumos',
    receitas: 'va_receitas',
    prodEstoque: 'va_estoque_prod',
    histProd: 'va_hist_prod',
    vendas: 'va_vendas',
    histCompras: 'va_hist_compras',
    revendedores: 'va_revendedores',
    estoqueRev: 'va_estoque_rev',
    histEnvios: 'va_hist_envios',
    histDevol: 'va_hist_devol',
    showVals: 'va_show_vals',
  };

  const load = (k, def) => { try{ const v = localStorage.getItem(k); return v? JSON.parse(v): def; }catch{ return def; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const parseNumber = (v) => {
    const s = String(v ?? '').trim().replace(/\./g,'').replace(',','.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };
  const fmtMoney = (v) => {
    const n = Number(v)||0;
    try{ return n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
    catch{ return 'R$ ' + n.toFixed(2); }
  };
  const today = () => {
    const d = new Date(); const p = (n)=>String(n).padStart(2,'0');
    return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}`;
  };

  function parseDateInput(id){
    const val = byId(id)?.value;
    if (!val) return today(); // se não preencher, usa hoje
    const [ano, mes, dia] = val.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  function toast(msg){
    const t = byId('toast');
    if (!t){ console.log('[Toast]', msg); return; }
    t.textContent = msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 2200);
  }

  // ===== Estado =====
  let INSUMOS = load(LS.insumos, []);            // [{nome, unidade, qtd, custo, ultimoCusto}]
  let RECEITAS = load(LS.receitas, {});          // {nome: {rend, itens:[{insumo,qtd}]}}
  let EST_PROD = load(LS.prodEstoque, {});       // {produto: {qtd}}
  let HIST_PROD = load(LS.histProd, []);
  let VENDAS = load(LS.vendas, []);
  let HIST_COMPRAS = load(LS.histCompras, []);
  let REVENDEDORES = load(LS.revendedores, []);
  let ESTOQUE_REV = load(LS.estoqueRev, {});
  let HIST_ENVIOS = load(LS.histEnvios, []);
  let HIST_DEVOL = load(LS.histDevol, []);
  let SHOW_VALS = load(LS.showVals, false);

  // Estado temporário do formulário de receita
  let FORM_RCP_ITENS = [];    // [{insumo, qtd}]
  let EDITING_RECIPE = null;  // nome da receita em edição (ou null)

  // ===== Helpers domínio =====
  const findInsumoByName = (nome) => INSUMOS.find(i => String(i.nome).toLowerCase()===String(nome).toLowerCase());
  const custoMedioUnit = (nome) => {
    const it = findInsumoByName(nome); if (!it) return 0;
    const qtd = Number(it.qtd)||0; const total = Number(it.custo)||0;
    return qtd>0 ? (total/qtd) : 0;
  };
  const custoReceitaUnit = (nomeReceita) => {
    const r = RECEITAS[nomeReceita]; if (!r) return 0;
    const total = (r.itens||[]).reduce((s,it)=> s + custoMedioUnit(it.insumo)*(Number(it.qtd)||0), 0);
    const rend = Number(r.rend)||1;
    return rend>0 ? total/rend : 0;
  };
  const produtosLista = () => Object.keys(EST_PROD||{});
  const receitasLista = () => Object.keys(RECEITAS||{});

  // ===== Nav =====
  function setupNav(){
    qsAll('.nav-btn').forEach(btn=>{
      btn.onclick = () => {
        qsAll('.nav-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        qsAll('.screen').forEach(s=>s.classList.remove('active'));
        const target = byId(btn.dataset.target);
        if (target) target.classList.add('active');
      };
    });
  }

  // ===== Render =====

  // Insumos
  function renderInsumos(){
    const tb = byId('insumos-tbody'); if (!tb) return;
    tb.innerHTML = '';
    INSUMOS.forEach((i, idx)=>{
      const cUnit = custoMedioUnit(i.nome);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i.nome}</td>
        <td>${i.unidade||'—'}</td>
        <td>${(Number(i.qtd)||0).toLocaleString('pt-BR')}</td>
        <td>${fmtMoney(Number(i.ultimoCusto)||0)}</td>
        <td>${fmtMoney(Number(i.custo)||0)}</td>
        <td>${fmtMoney(cUnit)}</td>
        <td class="right">
          <button class="btn outline btn-ins-recomprar" data-ins-recomprar="${idx}">Recomprar</button>
          <button class="btn ghost btn-ins-del" data-ins-del="${idx}">Excluir</button>
        </td>`;
      tb.appendChild(tr);
    });
    // Popular select de ingredientes na tela de receitas
    const sel = byId('rcp-ins');
    if (sel){
      sel.innerHTML='';
      INSUMOS.forEach(i => {
        const opt = document.createElement('option'); opt.value = i.nome; opt.textContent = i.nome; sel.appendChild(opt);
      });
    }
  }

  // Histórico de compras
  function renderHistCompras(){
    const tb = byId('tb-hist-compras'); if(!tb) return;
    tb.innerHTML = '';
    (HIST_COMPRAS||[]).slice().reverse().forEach(h=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${h.data}</td><td>${h.nome}</td><td>${h.unidade||'—'}</td><td>${h.qtd}</td><td>${fmtMoney(h.custo)}</td><td>${fmtMoney(h.custoUnit)}</td>`;
      tb.appendChild(tr);
    });
  }

  // Receitas (lista)
  function renderReceitas(){
    const tb = byId('tb-receitas'); if (!tb) return;
    tb.innerHTML = '';
    receitasLista().forEach((nome)=>{
      const r = RECEITAS[nome];
      const unit = custoReceitaUnit(nome);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${nome}</td>
        <td>${r.rend}</td>
        <td>${fmtMoney(unit)}</td>
        <td class="right">
          <button class="btn outline" data-edit-rec="${nome}">Editar</button>
          <button class="btn ghost" data-del-rec="${nome}">Excluir</button>
        </td>`;
      tb.appendChild(tr);
    });
  }

  // Itens no formulário de receita
  function renderRcpItens(){
    const tb = byId('tb-rcp-itens'); if (!tb) return;
    tb.innerHTML = '';
    FORM_RCP_ITENS.forEach((it, idx)=>{
      const cUnit = custoMedioUnit(it.insumo);
      const subtotal = cUnit * (Number(it.qtd)||0);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${it.insumo}</td>
        <td>${it.qtd}</td>
        <td>${fmtMoney(cUnit)}</td>
        <td>${fmtMoney(subtotal)}</td>
        <td class="right"><button class="btn ghost" data-del-it="${idx}">Remover</button></td>`;
      tb.appendChild(tr);
    });
  }

  // Estoque
  function renderEstoque(){
    const tbp = byId('tb-prod-estoque'); if (tbp){
      tbp.innerHTML = '';
      Object.entries(EST_PROD||{}).forEach(([nome,data])=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${nome}</td><td>${data.qtd}</td><td>${fmtMoney(custoReceitaUnit(nome))}</td>`;
        tbp.appendChild(tr);
      });
    }
    const tbi = byId('tb-ins-estoque'); if (tbi){
      tbi.innerHTML = '';
      INSUMOS.forEach((i)=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${i.nome}</td><td>${i.unidade||'—'}</td><td>${i.qtd}</td><td>${fmtMoney(custoMedioUnit(i.nome))}</td>`;
        tbi.appendChild(tr);
      });
    }
  }

  function renderHistProd(){
    const tb = byId('tb-hist-prod'); if(!tb) return;
    tb.innerHTML = '';
    (HIST_PROD||[]).slice().reverse().forEach(h=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${h.data}</td><td>${h.receita}</td><td>${h.qtd}</td><td>${fmtMoney(h.custoTotal)}</td>`;
      tb.appendChild(tr);
    });
  }

  function renderVendas(){
    const tb = byId('tb-vendas'); if(!tb) return;
    tb.innerHTML = '';
    (VENDAS||[]).slice().reverse().forEach(v=>{
      const tr = document.createElement('tr');
      const custoUnit = custoReceitaUnit(v.produto);
      tr.innerHTML = `<td>${v.data}</td><td>${v.produto}</td><td>${v.qtd}</td><td>${fmtMoney(v.preco)}</td><td>${fmtMoney(custoUnit)}</td><td>${fmtMoney(v.lucro)}</td><td>${(v.markup||0).toFixed(1)}%</td>`;
      tb.appendChild(tr);
    });
  }

  function renderRevendedores(){
    const tb = byId('tb-revendedores'); if(!tb) return;
    tb.innerHTML = '';
    REVENDEDORES.forEach((r, idx)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.nome}</td><td>${r.contato||'—'}</td><td class="right"><button class="btn ghost" data-del-rev="${idx}">Excluir</button></td>`;
      tb.appendChild(tr);
    });
    // popular selects
    const selVnd = byId('vnd-origem');
    if (selVnd){
      selVnd.innerHTML='';
      const base = document.createElement('option'); base.value='Direto'; base.textContent='Direto'; selVnd.appendChild(base);
      REVENDEDORES.forEach(r=>{ const o=document.createElement('option'); o.value=r.nome; o.textContent=r.nome; selVnd.appendChild(o); });
    }
    ['env-rev','dev-rev'].forEach(id=>{
      const sel = byId(id); if(!sel) return;
      sel.innerHTML='';
      REVENDEDORES.forEach(r=>{ const o=document.createElement('option'); o.value=r.nome; o.textContent=r.nome; sel.appendChild(o); });
    });
  }

  function renderEstoqueRev(){
    const tb = byId('tb-rev-estoque'); if(!tb) return;
    tb.innerHTML='';
    Object.entries(ESTOQUE_REV||{}).forEach(([rev, prods])=>{
      Object.entries(prods).forEach(([p, qtd])=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${rev}</td><td>${p}</td><td>${qtd}</td>`;
        tb.appendChild(tr);
      });
    });
  }

  function renderHistEnvios(){
    const tb = byId('tb-hist-envios'); if(!tb) return;
    tb.innerHTML='';
    (HIST_ENVIOS||[]).slice().reverse().forEach(h=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${h.data}</td><td>${h.produto}</td><td>${h.revendedor}</td><td>${h.qtd}</td>`;
      tb.appendChild(tr);
    });
  }

  function renderHistDevol(){
    const tb = byId('tb-hist-devolucoes'); if(!tb) return;
    tb.innerHTML='';
    (HIST_DEVOL||[]).slice().reverse().forEach(h=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${h.data}</td><td>${h.produto}</td><td>${h.revendedor}</td><td>${h.qtd}</td>`;
      tb.appendChild(tr);
    });
  }

  function refreshProductSelects(){
    const list = produtosLista();
    ['env-prod','dev-prod','vnd-prod'].forEach(id=>{
      const sel = byId(id); if(!sel) return;
      sel.innerHTML='';
      list.forEach(p=>{ const o=document.createElement('option'); o.value=p; o.textContent=p; sel.appendChild(o); });
    });
  }

  function refreshRecipeSelects(){
    const list = receitasLista();
    ['prod-receita','prod-rec'].forEach(id=>{
      const sel = byId(id); if(!sel) return;
      sel.innerHTML='';
      list.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; sel.appendChild(o); });
    });
  }

  function computeKPIs(){
    const fat = (VENDAS||[]).reduce((s,v)=> s + (Number(v.preco)||0)*(Number(v.qtd)||0), 0);
    const lucro = (VENDAS||[]).reduce((s,v)=> s + (Number(v.lucro)||0), 0);
    const mks = (VENDAS||[]).map(v=> Number(v.markup)||0);
    const markupMedio = mks.length ? (mks.reduce((a,b)=>a+b,0)/mks.length) : 0;
    const vendasCount = (VENDAS||[]).length;
    return {fat, lucro, markupMedio, vendasCount};
  }

  function renderDashboard(){
    const {fat, lucro, markupMedio, vendasCount} = computeKPIs();
    const kFat = byId('kpi-fat'), kLuc = byId('kpi-lucro'), kMk = byId('kpi-markup'), kVnd = byId('kpi-vendas');
    if (SHOW_VALS){
      if (kFat) kFat.textContent = fmtMoney(fat);
      if (kLuc) kLuc.textContent = fmtMoney(lucro);
      if (kMk) kMk.textContent = (markupMedio||0).toFixed(1)+'%';
      if (kVnd) kVnd.textContent = String(vendasCount);
    } else {
      [kFat,kLuc,kMk,kVnd].forEach(el=>{ if(el) el.textContent='•••'; });
    }
    const tb = byId('dash-ult-vendas');
    if (tb){
      tb.innerHTML='';
      (VENDAS||[]).slice(-5).reverse().forEach(v=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${v.data}</td><td>${v.produto}</td><td>${v.qtd}</td><td>${fmtMoney(v.preco*v.qtd)}</td><td>${fmtMoney(v.lucro)}</td>`;
        tb.appendChild(tr);
      });
    }
    renderCharts();
  }

  // ===== Charts =====
  let CHARTS = {insumos:null, estoque:null, vendas:null};

  function renderCharts(){
    if (typeof Chart === 'undefined') return;
    // Insumos (quantidades)
    const cIn = byId('chart-insumos');
    if (cIn){
      const labels = INSUMOS.map(i=>i.nome);
      const data = INSUMOS.map(i=> Number(i.qtd)||0);
      CHARTS.insumos = upsertBar(CHARTS.insumos, cIn, labels, data, 'Insumos (Qtd)');
    }
    // Estoque produtos
    const cEs = byId('chart-estoque');
    if (cEs){
      const labels = Object.keys(EST_PROD||{});
      const data = labels.map(n => Number(EST_PROD[n]?.qtd)||0);
      CHARTS.estoque = upsertBar(CHARTS.estoque, cEs, labels, data, 'Estoque (Produtos)');
    }
    // Vendas (faturamento por data)
    const cV = byId('chart-vendas');
    if (cV){
      const map = {};
      (VENDAS||[]).forEach(v=>{
        map[v.data] = (map[v.data]||0) + (Number(v.preco)||0)*(Number(v.qtd)||0);
      });
      const labels = Object.keys(map).sort((a,b)=>{
        const pa=a.split('/').reverse().join('-'); const pb=b.split('/').reverse().join('-');
        return pa.localeCompare(pb);
      });
      const data = labels.map(d=> map[d]);
      CHARTS.vendas = upsertLine(CHARTS.vendas, cV, labels, data, 'Faturamento Diário');
    }
  }

  function upsertBar(chartRef, canvas, labels, data, label){
    if (chartRef){
      chartRef.data.labels = labels;
      chartRef.data.datasets[0].data = data;
      chartRef.update();
      return chartRef;
    }
    return new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: { labels, datasets: [{ label, data }]},
      options: { responsive:true, maintainAspectRatio:false }
    });
  }
  function upsertLine(chartRef, canvas, labels, data, label){
    if (chartRef){
      chartRef.data.labels = labels;
      chartRef.data.datasets[0].data = data;
      chartRef.update();
      return chartRef;
    }
    return new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels, datasets: [{ label, data }]},
      options: { responsive:true, maintainAspectRatio:false }
    });
  }

  function renderAll(){
    renderInsumos();
    renderHistCompras();
    renderReceitas();
    renderRcpItens();
    renderEstoque();
    renderHistProd();
    renderVendas();
    renderRevendedores();
    renderEstoqueRev();
    renderHistEnvios();
    renderHistDevol();
    refreshProductSelects();
    refreshRecipeSelects();
    renderDashboard();
  }

  // ===== Eventos =====
  function setupEvents(){
    // Toggle valores
    const btnToggle = byId('btn-toggle-vals');
    if (btnToggle){
      const applyLabel = ()=> btnToggle.textContent = SHOW_VALS ? '🙈 Ocultar Valores' : '👁 Exibir Valores';
      applyLabel();
      btnToggle.onclick = ()=>{ SHOW_VALS = !SHOW_VALS; save(LS.showVals, SHOW_VALS); applyLabel(); renderDashboard(); };
    }

        // Cadastrar Insumo
    const btnIns = byId('btn-ins-salvar');
    if (btnIns){
      btnIns.onclick = ()=>{
        const nome = (byId('ins-nome')?.value||'').trim();
        const un = (byId('ins-un')?.value||'').trim();
        const qtd = parseNumber(byId('ins-qtd')?.value||'0');
        const custo = parseNumber(byId('ins-custo')?.value||'0');
        if (!nome || !un || qtd<=0 || custo<=0) return toast('Preencha os campos de insumo corretamente.');

        const custoUnitCompra = custo / qtd;
        let it = findInsumoByName(nome);
        let isRecompra = false;

        if (it){
          // Já existe → é recompra
          it.qtd += qtd;
          it.custo += custo;
          it.ultimoCusto = custoUnitCompra;
          isRecompra = true;
        } else {
          // Novo insumo
          it = { nome, unidade: un, qtd, custo, ultimoCusto: custoUnitCompra };
          INSUMOS.push(it);
        }

        const data = parseDateInput('ins-data');
        HIST_COMPRAS.push({ data, nome, unidade: un, qtd, custo, custoUnit: custoUnitCompra });

        save(LS.insumos, INSUMOS);
        save(LS.histCompras, HIST_COMPRAS);
        renderInsumos(); renderHistCompras(); renderEstoque(); renderDashboard();

        if (isRecompra){
          toast('Recompra registrada!');
          // Só limpa campos variáveis
          byId('ins-qtd').value = '';
          byId('ins-custo').value = '';
          byId('ins-data').value = '';
          byId('ins-qtd').focus();
        } else {
          toast('Insumo adicionado!');
          // Limpa tudo
          byId('ins-nome').value = '';
          byId('ins-un').value = '';
          byId('ins-qtd').value = '';
          byId('ins-custo').value = '';
          byId('ins-data').value = '';
        }
      };
    }

        // Delegação: excluir / recomprar insumo
    const tbIns = byId('insumos-tbody');
    if (tbIns){
      tbIns.addEventListener('click', (ev)=>{
        const del = ev.target.closest('[data-ins-del]');
	if (del){
  	const idx = Number(del.dataset.insDel);
  	if (!Number.isInteger(idx)) return;
  
 	 if (confirm('Tem certeza que deseja excluir este insumo?')) {
  	  INSUMOS.splice(idx,1);
  	  save(LS.insumos, INSUMOS);
   	 renderInsumos(); renderEstoque(); renderDashboard();
   	 return toast('Insumo excluído!');
 	 }
	}

        const rec = ev.target.closest('[data-ins-recomprar]');
        if (rec){
          const idx = Number(rec.dataset.insRecomprar);
          const it = INSUMOS[idx]; if (!it) return;

          // Preenche o formulário de cadastro com os dados do insumo
          byId('ins-nome').value = it.nome;
          byId('ins-un').value = it.unidade;
          byId('ins-qtd').value = '';
          byId('ins-custo').value = '';
          byId('ins-data').value = '';

          // Foca no campo quantidade
          byId('ins-qtd').focus();

          return toast(`Recomprando insumo "${it.nome}". Preencha quantidade e custo e clique em Salvar.`);
        }
      });
    }

// Apagar histórico de compras
const btnClearHist = byId('btn-clear-hist');
if (btnClearHist) {
  btnClearHist.onclick = ()=>{
    if (confirm('Tem certeza que deseja apagar TODO o histórico de compras?')) {
      HIST_COMPRAS = [];
      save(LS.histCompras, HIST_COMPRAS);
      renderHistCompras();
      toast('Histórico de compras apagado.');
    }
  };

    // === Exportar / Importar Backup ===
    const btnExport = byId('btn-export');
    if (btnExport) {
      btnExport.onclick = ()=>{
        const data = {
          insumos: INSUMOS,
          receitas: RECEITAS,
          prodEstoque: EST_PROD,
          histProd: HIST_PROD,
          vendas: VENDAS,
          histCompras: HIST_COMPRAS,
          revendedores: REVENDEDORES,
          estoqueRev: ESTOQUE_REV,
          histEnvios: HIST_ENVIOS,
          histDevol: HIST_DEVOL,
          showVals: SHOW_VALS
        };
        const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'dados-exportados.json';
        a.click();
        URL.revokeObjectURL(a.href);
        toast('Backup exportado com sucesso!');
      };
    }

    const inpImport = byId('inp-import');
    if (inpImport) {
      inpImport.onchange = (ev)=>{
        const file = ev.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (e)=>{
          try{
            const data = JSON.parse(e.target.result);
            INSUMOS = data.insumos||[];
            RECEITAS = data.receitas||{};
            EST_PROD = data.prodEstoque||{};
            HIST_PROD = data.histProd||[];
            VENDAS = data.vendas||[];
            HIST_COMPRAS = data.histCompras||[];
            REVENDEDORES = data.revendedores||[];
            ESTOQUE_REV = data.estoqueRev||{};
            HIST_ENVIOS = data.histEnvios||[];
            HIST_DEVOL = data.histDevol||[];
            SHOW_VALS = !!data.showVals;
            save(LS.insumos, INSUMOS);
            save(LS.receitas, RECEITAS);
            save(LS.prodEstoque, EST_PROD);
            save(LS.histProd, HIST_PROD);
            save(LS.vendas, VENDAS);
            save(LS.histCompras, HIST_COMPRAS);
            save(LS.revendedores, REVENDEDORES);
            save(LS.estoqueRev, ESTOQUE_REV);
            save(LS.histEnvios, HIST_ENVIOS);
            save(LS.histDevol, HIST_DEVOL);
            save(LS.showVals, SHOW_VALS);
            renderAll();
            toast('Backup importado com sucesso!');
          } catch(err){
            toast('Erro ao importar arquivo.');
          }
        };
        reader.readAsText(file);
        ev.target.value = '';
      };
    }
}

// Apagar histórico de produção
const btnClearProd = byId('btn-clear-prod');
if (btnClearProd) {
  btnClearProd.onclick = ()=>{
    if (confirm('Tem certeza que deseja apagar TODO o histórico de produção?')) {
      HIST_PROD = [];
      save(LS.histProd, HIST_PROD);
      renderHistProd();
      toast('Histórico de produção apagado.');
    }
  };
}

// Apagar histórico de vendas
const btnClearVnd = byId('btn-clear-vnd');
if (btnClearVnd) {
  btnClearVnd.onclick = ()=>{
    if (confirm('Tem certeza que deseja apagar TODO o histórico de vendas?')) {
      VENDAS = [];
      save(LS.vendas, VENDAS);
      renderVendas();
      toast('Histórico de vendas apagado.');
    }
  };
}

// Reset total do sistema
const btnReset = byId('btn-reset');
if (btnReset) {
  btnReset.onclick = ()=>{
    if (confirm('⚠️ Tem certeza que deseja resetar TODO o sistema? Essa ação não pode ser desfeita.')) {
      localStorage.clear();
      location.reload();
    }
  };
}


// ===== Receitas =====
    // Adicionar ingrediente na receita (form)
    const btnAddIt = byId('btn-add-insumo-receita');
    if (btnAddIt){
      btnAddIt.onclick = ()=>{
        const ins = (byId('rcp-ins')?.value||'').trim();
        const qtd = parseNumber(byId('rcp-ins-qtd')?.value||'0');
        if (!ins || qtd<=0) return toast('Selecione um insumo e informe a quantidade.');
        FORM_RCP_ITENS.push({insumo: ins, qtd});
        renderRcpItens();
      };
    }

    // Remover item do form (delegação)
    const tbRcpIt = byId('tb-rcp-itens');
    if (tbRcpIt){
      tbRcpIt.addEventListener('click', (ev)=>{
        const btn = ev.target.closest('[data-del-it]'); if(!btn) return;
        const idx = Number(btn.dataset.delIt);
        if (!Number.isInteger(idx)) return;
        FORM_RCP_ITENS.splice(idx,1);
        renderRcpItens();
      });
    }

    // Salvar receita (nova ou edição)
    const btnSaveR = byId('btn-rcp-salvar') || byId('btn-rcp-salvar');
    if (btnSaveR){
      btnSaveR.onclick = ()=>{
        const nome = (byId('rec-nome')?.value||'').trim();
        const rend = parseNumber(byId('rec-rend')?.value||'0');
        if (!nome || rend<=0) return toast('Informe nome e rendimento da receita.');
        const itens = FORM_RCP_ITENS.slice();
        RECEITAS[nome] = { rend, itens };
        save(LS.receitas, RECEITAS);
        EDITING_RECIPE = null; FORM_RCP_ITENS = [];
        byId('btn-rcp-cancelar')?.style && (byId('btn-rcp-cancelar').style.display = 'none');
        renderReceitas(); renderRcpItens(); refreshRecipeSelects(); renderDashboard();
        toast('Receita salva!');
      };
    }

    // Cancelar edição
    const btnCancelR = byId('btn-rcp-cancelar');
    if (btnCancelR){
      btnCancelR.onclick = ()=>{
        EDITING_RECIPE = null; FORM_RCP_ITENS = [];
        const nm = byId('rec-nome'); const rd = byId('rec-rend');
        if (nm) nm.value=''; if (rd) rd.value='';
        btnCancelR.style.display='none';
        renderRcpItens();
      };
    }

    // Delegação: editar/excluir receita
    const tbRec = byId('tb-receitas');
    if (tbRec){
      tbRec.addEventListener('click', (ev)=>{
        const del = ev.target.closest('[data-del-rec]');
        if (del){
          const nome = del.dataset.delRec;
          if (RECEITAS[nome]){
            delete RECEITAS[nome];
            save(LS.receitas, RECEITAS);
            if (EDITING_RECIPE === nome){ EDITING_RECIPE = null; FORM_RCP_ITENS = []; }
            renderReceitas(); refreshRecipeSelects(); renderRcpItens(); renderDashboard();
            return toast('Receita excluída!');
          }
        }
        const ed = ev.target.closest('[data-edit-rec]');
        if (ed){
          const nome = ed.dataset.editRec; const r = RECEITAS[nome]; if(!r) return;
          EDITING_RECIPE = nome;
          const nm = byId('rec-nome'); const rd = byId('rec-rend');
          if (nm) nm.value = nome; if (rd) rd.value = r.rend;
          FORM_RCP_ITENS = (r.itens||[]).map(it=> ({...it}));
          byId('btn-rcp-cancelar')?.style && (byId('btn-rcp-cancelar').style.display = 'inline-flex');
          renderRcpItens();
        }
      });
    }

    // ===== Produção =====
    const btnProd = byId('btn-produzir');
    if (btnProd){
      btnProd.onclick = ()=>{
        const recSel = firstEl(['prod-receita','prod-rec']);
        const nome = (recSel?.value||'').trim();
        const qtd = parseNumber(byId('prod-qtd')?.value||'0');
        if (!nome || qtd<=0 || !RECEITAS[nome]) return toast('Selecione uma receita válida e quantidade.');
        EST_PROD[nome] = EST_PROD[nome] || {qtd:0};
        EST_PROD[nome].qtd += qtd;
        const custoTotal = custoReceitaUnit(nome)*qtd;
	const data = parseDateInput('prod-data'); 
        HIST_PROD.push({ data, receita: nome, qtd, custoTotal });
        save(LS.prodEstoque, EST_PROD); save(LS.histProd, HIST_PROD);
        renderEstoque(); renderHistProd(); refreshProductSelects(); renderDashboard();
        toast('Produção registrada!');
      };
    }

    // ===== Vendas =====
    const btnVenda = byId('btn-vender');
    if (btnVenda){
      btnVenda.onclick = ()=>{
        const produto = (byId('vnd-prod')?.value||'').trim();
        const qtd = parseNumber(byId('vnd-qtd')?.value||'0');
        const preco = parseNumber(byId('vnd-preco')?.value||'0');
        const origem = (byId('vnd-origem')?.value||'Direto');
        if (!produto || qtd<=0 || preco<=0) return toast('Preencha a venda corretamente.');
        let ok = false;
        if (origem==='Direto'){
          if ((EST_PROD[produto]?.qtd||0) >= qtd){ EST_PROD[produto].qtd -= qtd; ok = true; }
        } else {
          if ((ESTOQUE_REV[origem]?.[produto]||0) >= qtd){ ESTOQUE_REV[origem][produto]-=qtd; ok=true; }
        }
        if (!ok) return toast('Estoque insuficiente para a venda.');
        const custoUnit = custoReceitaUnit(produto);
        const receita = preco*qtd;
        const custoTotal = custoUnit*qtd;
        const lucro = receita - custoTotal;
        const markup = custoTotal>0 ? (lucro/custoTotal)*100 : 0;
	const data = parseDateInput('vnd-data');
        VENDAS.push({ data, produto, qtd, preco, lucro, markup, origem });
        save(LS.vendas, VENDAS); save(LS.prodEstoque, EST_PROD); save(LS.estoqueRev, ESTOQUE_REV);
        renderEstoque(); renderEstoqueRev(); renderVendas(); renderDashboard();
        toast('Venda registrada!');
      };
    }

    // Revendedor adicionar / excluir
    const btnRev = byId('btn-rev-salvar');
    if (btnRev){
      btnRev.onclick = ()=>{
        const nome = (byId('rev-nome')?.value||'').trim();
        const contato = (byId('rev-contato')?.value||'').trim();
        if (!nome) return toast('Informe o nome do revendedor.');
        REVENDEDORES.push({nome, contato});
        save(LS.revendedores, REVENDEDORES);
        renderRevendedores();
        toast('Revendedor adicionado!');
      };
    }
    const tbRev = byId('tb-revendedores');
    if (tbRev){
      tbRev.addEventListener('click',(ev)=>{
        const del = ev.target.closest('[data-del-rev]'); if(!del) return;
        const idx = Number(del.dataset.delRev);
        const rev = REVENDEDORES[idx]?.nome; if (!rev) return;
        delete ESTOQUE_REV[rev];
        REVENDEDORES.splice(idx,1);
        save(LS.revendedores, REVENDEDORES); save(LS.estoqueRev, ESTOQUE_REV);
        renderRevendedores(); renderEstoqueRev();
        toast('Revendedor excluído!');
      });
    }

    // Envios
    const btnEnv = byId('btn-env');
    if (btnEnv){
      btnEnv.onclick = ()=>{
        const prod = (byId('env-prod')?.value||'').trim();
        const rev = (byId('env-rev')?.value||'').trim();
        const qtd = parseNumber(byId('env-qtd')?.value||'0');
        if (!prod || !rev || qtd<=0) return toast('Preencha o envio corretamente.');
        if ((EST_PROD[prod]?.qtd||0) < qtd) return toast('Estoque principal insuficiente.');
        EST_PROD[prod].qtd -= qtd;
        ESTOQUE_REV[rev] = ESTOQUE_REV[rev] || {};
        ESTOQUE_REV[rev][prod] = (ESTOQUE_REV[rev][prod]||0) + qtd;
        HIST_ENVIOS.push({ data: today(), produto: prod, revendedor: rev, qtd });
        save(LS.prodEstoque, EST_PROD); save(LS.estoqueRev, ESTOQUE_REV); save(LS.histEnvios, HIST_ENVIOS);
        renderEstoque(); renderEstoqueRev(); renderHistEnvios();
        toast('Envio registrado!');
	byId('env-prod').value = '';
	byId('env-rev').value = '';
	byId('env-qtd').value = '';
	byId('env-data').value = '';
      };
    }

    // Devoluções
    const btnDev = byId('btn-dev');
    if (btnDev){
      btnDev.onclick = ()=>{
        const prod = (byId('dev-prod')?.value||'').trim();
        const rev = (byId('dev-rev')?.value||'').trim();
        const qtd = parseNumber(byId('dev-qtd')?.value||'0');
        if (!prod || !rev || qtd<=0) return toast('Preencha a devolução corretamente.');
        if ((ESTOQUE_REV[rev]?.[prod]||0) < qtd) return toast('Estoque no revendedor insuficiente.');
        ESTOQUE_REV[rev][prod] -= qtd;
        EST_PROD[prod] = EST_PROD[prod] || {qtd:0};
        EST_PROD[prod].qtd += qtd;
        HIST_DEVOL.push({ data: today(), produto: prod, revendedor: rev, qtd });
        save(LS.prodEstoque, EST_PROD); save(LS.estoqueRev, ESTOQUE_REV); save(LS.histDevol, HIST_DEVOL);
        renderEstoque(); renderEstoqueRev(); renderHistDevol();
        toast('Devolução registrada!');
	byId('dev-prod').value = '';
	byId('dev-rev').value = '';
	byId('dev-qtd').value = '';
	byId('dev-data').value = '';
      };
    }
  }

  // ===== Boot =====
  window.addEventListener('DOMContentLoaded', ()=>{
    setupNav();
    setupEvents();
    renderAll();
  });

})();