(function(){
"use strict";

/* =====================================================================
   BONUS COLONNINE CHECK — il controllo che Invitalia farà dopo, fatto prima.
   Terzo strumento gratuito del canale «Gianluca Gualco — Energia».
   File unico, nessuna dipendenza, nessun tracciamento, funziona offline.
   ES5 di proposito: deve girare anche su televisori e telefoni vecchi.
   ===================================================================== */

var CANALE="https://www.youtube.com/@gianlucagualcoenergia?sub_confirmation=1";
var NOMEFILE="bonus-colonnine-la-mia-checklist";
var INVITALIA="https://www.invitalia.it/incentivi-e-strumenti/bonus-colonnine-domestiche";
var MANUALE="https://manuali.invitalia.it/bcd26/";
var GSE_PAGINA="https://www.gse.it/servizi-per-te/rinnovabili-per-i-trasporti/agevolazioni-per-la-ricarica-dei-veicoli-elettrici/elenco-dispositivi";
var GSE_PDF_GDC="https://www.gse.it/servizi-per-te_site/rinnovabili-per-i-trasporti_site/agevolazioni-per-la-ricarica-dei-veicoli-elettrici_site/Documents/P541_Elenco%20dispositivi%20idonei%20alla%20sperimentazione%20GDC.pdf";
var GSE_PDF_NOGDC="https://www.gse.it/servizi-per-te_site/rinnovabili-per-i-trasporti_site/agevolazioni-per-la-ricarica-dei-veicoli-elettrici_site/Documents/P541_Elenco%20dispositivi%20idonei%20alla%20sperimentazione%20NO%20GDC.pdf";

/* ==================== COSTANTI, OGNUNA CON LA SUA FONTE ====================
   Replicate in parametri.json, che è la fonte di verità documentale. Quando si
   aggiorna il JSON va aggiornato anche questo blocco: la pagina deve restare un
   file unico che funziona anche senza rete. */

/* Contributo: 80% di acquisto e posa in opera, entro 1.500 € per persona fisica e
   8.000 € se la posa è sulle parti comuni di un condominio.
   DPCM 10/06/2026 art. 6 c. 1; DD MIMIT 4/08/2026 art. 2 c. 1-2. */
var PERC=80, TETTO_PRIVATO=1500, TETTO_CONDOMINIO=8000;

/* Finestra delle spese: dal 26/06/2026 (entrata in vigore del DPCM) al 31/03/2030.
   Per l'annualità 2026 contano le installazioni COMPLETATE fra il 26/06 e il 31/12/2026.
   Conta la data di completamento dell'installazione, non quella dell'acquisto.
   DD 4/08/2026 art. 3 c. 1; DD 11/09/2026 (sportello) art. 1 c. 1. */
var SPESE_DAL="26 giugno 2026", FINE_2026="31 dicembre 2026";

/* Sportello 2026: dalle 12:00 del 22/09/2026 alle 12:00 del 31/01/2027, con
   possibile chiusura anticipata per esaurimento delle risorse. Istruttoria in
   ordine cronologico. DD 11/09/2026 (sportello) art. 3. */
var APRE=new Date(2026,8,22,12,0,0), CHIUDE=new Date(2027,0,31,12,0,0);

/* Erogazione: unica soluzione, con decreto cumulativo, entro 90 giorni dal termine
   di presentazione delle domande. DD 4/08/2026 art. 7. */
var EROGA_GIORNI=90;

/* Dotazione 2026: 15 milioni (10 residui 2025 + 5 di competenza 2026).
   DD 11/09/2026 (sportello) art. 2. Poi 15 M€ l'anno fino al 2029 e 8 M€ nel 2030. */
var DOTAZIONE=15000000;

/* Benchmark dell'edizione 2024 (20 M€): 5.319 domande nel primo mese per 6,31 M€
   richiesti — ticket medio 1.187 €. Comunicato MIMIT. È l'unico dato storico
   che esiste: la stima di tenuta del fondo è un'elaborazione mia su quel numero. */
var TICKET_2024=1187, DOMANDE_2024_MESE1=5319, DOTAZIONE_2024=20000000;

/* Domande arrivate a questo sportello: NESSUN DATO UFFICIALE finché MIMIT o
   Invitalia non lo pubblicano. Si aggiorna a mano, con la data. */
var DOMANDE_ARRIVATE=null, DOMANDE_ARRIVATE_AL=null;

/* Controlli ex post a campione sul 10% delle erogazioni, fino al 20%;
   10 giorni per integrare, restituzione entro 60 giorni in caso di revoca.
   DD 11/09/2026 (controlli) art. 2-4. */
var CAMPIONE=10, RESTITUZIONE_GIORNI=60;

/* Termine di alternativa: la detrazione ordinaria per gli interventi sull'abitazione,
   50% sulla prima casa e 36% sulle altre nel 2026, in dieci rate annuali (L. 199/2025).
   ATTENZIONE: qui è un'IPOTESI di confronto, non un'affermazione che la wallbox ci
   rientri — quella specifica per le colonnine è scaduta il 31/12/2021. Serve a far
   vedere che i due benefici non si sommano e che cosa si perde scegliendo l'uno. */
var DETRAZIONE={prima:50, altre:36}, RATE=10;

/* Elenco GSE dei dispositivi idonei (delibera ARERA 541/2020), versione Settembre 2026:
   45 costruttori, 129 modelli, 302 versioni. Dati incorporati in fondo a questo file
   (variabile GSE), estratti dai due PDF il 24/09/2026 con lo script in _build/. */
var GSE_VERSIONE="Maggio 2026";

var S={
  iscritto:null, chi:null, residente:null, fase:null, quando:null,
  ruolo:null, partecipanti:12, delibera:null,
  luogo:null, uso:null, nuovo:null, installatore:null,
  modello:null, modelloStato:null, /* "trovato" | "assente" | "nonscelto" */
  fattura:null, pagamento:null, cumulo:null, precedenti:null, strumenti:null,
  spesa:1600, casa:"prima",
  /* parametri modificabili in fondo alla pagina */
  perc:PERC, tettoPriv:TETTO_PRIVATO, tettoCondo:TETTO_CONDOMINIO,
  detr:null, rate:RATE, ticket:TICKET_2024, dotazione:DOTAZIONE,
  arrivate:DOMANDE_ARRIVATE
};

/* ==================== FORMATTAZIONE ==================== */
function num(n,d){
  d=d||0; var neg=n<0; n=Math.abs(n);
  var p=n.toFixed(d).split("."),i=p[0],o="";
  for(var k=0;k<i.length;k++){ if(k>0&&(i.length-k)%3===0)o+="."; o+=i[k]; }
  return (neg?"−":"")+o+(p[1]?","+p[1]:"");
}
var eur=function(n){return num(Math.round(n))+" €"};
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function data(d){ return ("0"+d.getDate()).slice(-2)+"/"+("0"+(d.getMonth()+1)).slice(-2)+"/"+d.getFullYear(); }

/* ==================== CHI SEI ==================== */
function condo(){ return S.chi==="condominio"; }
function fatto(){ return S.fase==="fatto"; }
function fuoriSubito(){ return S.chi==="impresa" || (S.chi==="privato"&&S.residente==="no"); }
/* l'annualità 2026 è l'unica con lo sportello aperto: serve l'elenco GSE */
function annualita2026(){ return S.quando==="2026" || S.quando==="entro2026" || S.quando==="nonso"; }
function tetto(){ return condo() ? S.tettoCondo : S.tettoPriv; }
function aliqDetr(){ return S.detr!==null ? S.detr : (condo()? DETRAZIONE.prima : DETRAZIONE[S.casa]); }

/* ==================== LE DOMANDE ==================== */
var PASSI=[
 {id:"iscritto", tipo:"singola", campo:"iscritto",
  titolo:"Prima di cominciare: ti chiedo l'iscrizione al canale.",
  aiuto:"Questo strumento è gratis, non chiede la mail, non traccia e non ha niente da venderti. <strong>Lo tengono in piedi solo le iscrizioni</strong>: sono quelle che mi permettono di leggere i decreti invece dei comunicati. Te lo chiedo una volta sola, adesso.",
  opzioni:[{v:"si",t:"Sono già iscritto",s:"Grazie. Andiamo avanti."},
           {v:"no",t:"Mi iscrivo adesso",s:"Il canale si apre in un'altra scheda: torna qui e continui da dove hai lasciato."}]},

 {id:"chi", tipo:"singola", campo:"chi",
  titolo:"Chi chiede il contributo?",
  aiuto:"Il bonus è riservato alle <strong>persone fisiche</strong> e ai <strong>condomìni</strong>. Ditte, società e pubbliche amministrazioni sono fuori per decreto, non per interpretazione.",
  opzioni:[{v:"privato",t:"Io, come privato",s:"Per la wallbox di casa mia: box, posto auto, cortile."},
           {v:"condominio",t:"Il condominio",s:"Per una colonnina sulle parti comuni, a uso dei condòmini."},
           {v:"impresa",t:"Un'impresa o una partita IVA",s:"Anche una ditta individuale."}]},

 {id:"residente", tipo:"singola", campo:"residente", saltaSe:function(){return S.chi!=="privato"},
  titolo:"Sei residente in Italia?",
  aiuto:"Il decreto chiede la <strong>residenza</strong>, non la cittadinanza. E la colonnina deve stare in Italia.",
  opzioni:[{v:"si",t:"Sì"},{v:"no",t:"No"}]},

 {id:"fase", tipo:"singola", campo:"fase", saltaSe:fuoriSubito,
  titolo:"A che punto sei?",
  aiuto:"Il contributo si chiede <strong>solo a installazione finita</strong>: il solo acquisto non basta. Ma gli errori che lo bruciano si fanno quasi tutti prima. Per questo la pagina ti serve in entrambi i casi, e in modo diverso.",
  opzioni:[{v:"fatto",t:"La colonnina è già installata",s:"Ho la fattura e l'installatore ha finito."},
           {v:"prima",t:"Sto per farlo",s:"La sto scegliendo, o l'ho comprata ma non è ancora montata."}]},

 {id:"quando", tipo:"singola", campo:"quando", saltaSe:function(){return fuoriSubito()||!fatto()},
  titolo:"Quando è stata completata l'installazione?",
  aiuto:"Conta la <strong>data di fine lavori</strong>, non quella dell'acquisto. Chi ha comprato a maggio e montato a luglio è dentro; chi ha montato a giugno prima del 26 è fuori.",
  opzioni:[{v:"prima2606",t:"Prima del 26 giugno 2026"},
           {v:"2026",t:"Dal 26 giugno al 31 dicembre 2026",s:"È l'annualità 2026, quella dello sportello che apre il 22 settembre."},
           {v:"2027",t:"Sarà finita nel 2027",s:"Allora non è questo sportello: se ne aprirà un altro."}]},

 {id:"quandoPrima", tipo:"singola", campo:"quando", saltaSe:function(){return fuoriSubito()||fatto()},
  titolo:"Quando pensi che sarà finita l'installazione?",
  aiuto:"Per stare nell'annualità 2026 l'installazione deve essere <strong>completata entro il 31 dicembre 2026</strong>, e la domanda va fatta prima che i fondi finiscano. Chi finisce nel 2027 aspetta lo sportello successivo, con una regola in meno (l'elenco GSE) e una in più (l'attestazione dell'installatore).",
  opzioni:[{v:"entro2026",t:"Entro il 31 dicembre 2026"},
           {v:"2027",t:"Nel 2027 o dopo"},
           {v:"nonso",t:"Non lo so ancora"}]},

 {id:"ruolo", tipo:"singola", campo:"ruolo", saltaSe:function(){return fuoriSubito()||!condo()},
  titolo:"Tu chi sei, nel condominio?",
  aiuto:"La domanda la presenta <strong>l'amministratore pro tempore</strong>. Solo nei condomìni <strong>fino a otto partecipanti</strong> può farla un condomino delegato.",
  opzioni:[{v:"amministratore",t:"L'amministratore"},
           {v:"delegato",t:"Un condomino delegato",s:"Vale solo se il condominio ha al massimo otto partecipanti."},
           {v:"condomino",t:"Un condomino",s:"Voglio capire se conviene proporlo in assemblea."}]},

 {id:"partecipanti", tipo:"numero", campo:"partecipanti", unita:"condòmini", min:2, saltaSe:function(){return fuoriSubito()||!condo()},
  titolo:"Quanti sono i condòmini?",
  aiuto:"Serve per due cose: la regola degli otto partecipanti e per farti vedere quanto pesa il contributo <strong>su ogni famiglia</strong>."},

 {id:"delibera", tipo:"singola", campo:"delibera", saltaSe:function(){return fuoriSubito()||!condo()},
  titolo:"L'assemblea ha deliberato i lavori?",
  aiuto:"Alla domanda vanno allegate la <strong>delibera</strong> che autorizza l'intervento sulle parti comuni e una dichiarazione dell'amministratore che <strong>non è stata impugnata</strong> nei termini dell'art. 1137 del codice civile (trenta giorni). I decreti non fissano un quorum: chiedono solo che la delibera ci sia e che regga.",
  opzioni:[{v:"si",t:"Sì, e i trenta giorni sono passati senza impugnazioni"},
           {v:"fresca",t:"Sì, ma da meno di trenta giorni",s:"O è stata impugnata."},
           {v:"no",t:"Non ancora"}]},

 {id:"luogo", tipo:"singola", campo:"luogo", saltaSe:function(){return fuoriSubito()||condo()},
  titolo:"Dove sta, o dove starà, la colonnina?",
  aiuto:"Deve essere installata in un'area nella tua <strong>piena disponibilità</strong>, per un uso <strong>esclusivamente privato</strong>, non accessibile al pubblico. Seconda casa e box separato vanno bene: il decreto non li esclude.",
  opzioni:[{v:"mio",t:"In un posto mio",s:"Box, posto auto assegnato, cortile di casa, anche nella seconda casa."},
           {v:"comuni",t:"Sulle parti comuni del condominio",s:"Cortile o autorimessa condominiale, a uso di tutti."},
           {v:"pubblico",t:"In un posto aperto al pubblico"}]},

 {id:"uso", tipo:"singola", campo:"uso", saltaSe:function(){return fuoriSubito()||!condo()},
  titolo:"Chi la userà?",
  aiuto:"Nel condominio l'infrastruttura deve essere a <strong>uso collettivo dei condòmini</strong>, non aperta a chi passa.",
  opzioni:[{v:"condomini",t:"Solo i condòmini"},
           {v:"pubblico",t:"Anche persone esterne, a pagamento o no"}]},

 {id:"nuovo", tipo:"singola", campo:"nuovo", saltaSe:fuoriSubito,
  titolo:"Il dispositivo è nuovo di fabbrica?",
  aiuto:"Usato, ricondizionato o «di dimostrazione» non passano: il decreto dice <strong>nuovo di fabbrica</strong>.",
  opzioni:[{v:"si",t:"Sì, nuovo"},{v:"no",t:"No, usato o ricondizionato"},
           {v:"nonso",t:"Non ho ancora scelto",s:"Allora lo sai: nuovo."}]},

 {id:"installatore", tipo:"singola", campo:"installatore", saltaSe:fuoriSubito,
  titolo:"Chi fa, o ha fatto, l'installazione?",
  aiuto:"Serve la <strong>dichiarazione di conformità</strong> prevista dall'art. 7 del DM 37/2008, e la può firmare solo un'impresa abilitata. Senza quel foglio la domanda è improcedibile, per quanto buono sia il lavoro.",
  opzioni:[{v:"abilitato",t:"Un'impresa abilitata, che rilascia la dichiarazione di conformità"},
           {v:"fai",t:"Io, o un conoscente, senza dichiarazione di conformità"},
           {v:"nonso",t:"Non ho ancora deciso"}]},

 {id:"modello", tipo:"ricerca", campo:"modello", saltaSe:function(){return fuoriSubito()||!annualita2026()},
  titolo:"Che modello è, o sarà?",
  aiuto:"Per l'annualità 2026 il dispositivo deve <strong>risultare nell'elenco del GSE</strong> vigente alla data della domanda, oltre a rispettare l'art. 4 della delibera ARERA 541/2020. Cerca per marca o modello: questo è l'elenco di <strong>"+GSE_VERSIONE+"</strong>, "+GSE_COSTRUTTORI+" costruttori e "+GSE_MODELLI+" modelli."},

 {id:"fattura", tipo:"singola", campo:"fattura", saltaSe:fuoriSubito,
  titolo: function(){ return fatto() ? "A nome di chi è la fattura?" : "La fattura, quando arriverà, a nome di chi sarà?"; },
  aiuto: function(){ return "Va allegata la <strong>fattura elettronica in formato XML</strong>, scaricata dal portale dell'Agenzia delle Entrate, intestata "+(condo()?"al <strong>condominio</strong>, con il suo codice fiscale":"a <strong>chi chiede il contributo</strong>")+". Una fattura al coniuge, a un figlio o a un'altra società è una domanda persa."; },
  opzioni:function(){ return [
           {v:"mia",t:condo()?"Al condominio, con il codice fiscale del condominio":"A me, elettronica"},
           {v:"altro",t:condo()?"A un condomino o all'amministratore":"A un'altra persona",s:"Coniuge, figlio, genitore, società."},
           {v:"cartacea",t:"È cartacea, non elettronica",s:"Ammessa solo se il fornitore è esonerato dalla fattura elettronica, e va provato."},
           fatto()?{v:"nonho",t:"Non l'ho"}:{v:"nonancora",t:"Non è ancora stata emessa"}]; }},

 {id:"pagamento", tipo:"singola", campo:"pagamento", saltaSe:fuoriSubito,
  titolo: function(){ return fatto() ? "Come hai pagato?" : "Come pagherai?"; },
  aiuto:"Solo <strong>bonifico, SEPA Credit Transfer o carta</strong> intestati a chi chiede il contributo, da un conto suo. Il decreto <strong>vieta il finanziamento</strong>: la wallbox a rate col credito al consumo non prende il bonus, anche se la fattura è perfetta.",
  opzioni:function(){ return [
           {v:"tracciato",t:"Bonifico, SCT o carta, dal "+(condo()?"conto del condominio":"mio conto")},
           {v:"contanti",t:"In contanti"},
           {v:"rate",t:"A rate, con un finanziamento",s:"Anche il «tasso zero» dell'installatore o del concessionario."},
           {v:"altro",t:"Dal conto di un'altra persona"},
           fatto()?null:{v:"nonancora",t:"Non ho ancora pagato"}].filter(function(o){return o}); }},

 {id:"cumulo", tipo:"singola", campo:"cumulo", saltaSe:fuoriSubito,
  titolo:"Sulla stessa spesa chiedi, o hai chiesto, un'altra agevolazione?",
  aiuto:"Il contributo <strong>non è cumulabile</strong> con nessun'altra agevolazione, anche fiscale, nazionale, regionale o europea, sulla medesima spesa. Se i controlli trovano il doppio beneficio, il contributo viene revocato e va restituito entro sessanta giorni.",
  opzioni:[{v:"no",t:"No, nessuna"},
           {v:"si",t:"Sì: una detrazione o un contributo regionale",s:"Sulla stessa fattura."},
           {v:"nonso",t:"Non lo so",s:"Per esempio: il commercialista la ha messa in dichiarazione insieme ad altri lavori."}]},

 {id:"precedenti", tipo:"singola", campo:"precedenti", saltaSe:function(){return fuoriSubito()||!fatto()},
  titolo:"Hai già presentato una domanda per questo bonus?",
  aiuto:"<strong>Una sola domanda per soggetto.</strong> Se la prima viene dichiarata improcedibile se ne può fare una seconda; se anche quella è improcedibile, l'accesso al contributo è chiuso. Per questo vale la pena controllare tutto adesso.",
  opzioni:[{v:"no",t:"No, è la prima"},
           {v:"una",t:"Una, dichiarata improcedibile",s:"Questa è l'ultima possibilità."},
           {v:"aperta",t:"Una, ancora in istruttoria"},
           {v:"due",t:"Due, entrambe improcedibili"}]},

 {id:"strumenti", tipo:"singola", campo:"strumenti", saltaSe:fuoriSubito,
  titolo: function(){ return condo() ? "L'amministratore ha SPID o CIE, e il condominio ha una PEC?" : "Hai SPID (o CIE, o CNS) e una PEC?"; },
  aiuto:"Si entra sulla piattaforma Invitalia solo con <strong>SPID, CIE o CNS</strong>, e la <strong>PEC</strong> deve restare attiva per tutta la durata del procedimento: è lì che arrivano le richieste di integrazione, con dieci giorni per rispondere.",
  opzioni:[{v:"entrambi",t:"Sì, entrambi"},
           {v:"nopec",t:"Manca la PEC"},
           {v:"nospid",t:"Manca SPID o CIE"},
           {v:"nessuno",t:"Mancano entrambi"}]},

 {id:"casa", tipo:"singola", campo:"casa", saltaSe:function(){return fuoriSubito()||condo()},
  titolo:"È la tua abitazione principale?",
  aiuto:"Al bonus non importa. Serve solo per il confronto con la detrazione fiscale, che sulla prima casa vale il 50% e sulle altre il 36%.",
  opzioni:[{v:"prima",t:"Sì"},{v:"altre",t:"No, è una seconda casa"}]},

 {id:"spesa", tipo:"numero", campo:"spesa", unita:"€, IVA compresa", min:1, saltaSe:fuoriSubito,
  titolo: function(){ return fatto() ? "Quanto hai speso in tutto, acquisto e posa?" : "Quanto pensi di spendere, acquisto e posa?"; },
  aiuto:"Il contributo copre acquisto e <strong>posa in opera</strong>, comprese le opere elettriche ed edili strettamente necessarie, la progettazione, il collaudo e l'eventuale <strong>nuovo contatore</strong>. Restano fuori tasse, consulenze diverse e autorizzazioni edilizie."}
];
function attivi(){return PASSI.filter(function(p){return !(p.saltaSe&&p.saltaSe())})}
function val(x){ return typeof x==="function" ? x() : x; }
var idx=0;

/* ==================== L'ELENCO GSE: LA RICERCA ==================== */
/* Nomi con cui la gente chiama i costruttori, che nell'elenco hanno la ragione sociale. */
var ALIAS={"ENEL X WAY S.R.L.":"enel x juicebox juice box","ZUCCHETTI CENTRO SISTEMI - ZCS":"zcs azzurro","BTICINO":"legrand",
  "FREE2MOVE ESOLUTIONS":"stellantis free2move","SCHNEIDER ELECTRIC":"schneider","DAZETECHNOLOGY SRL":"daze","QUERCIA SRL":"quercia",
  "DIELECTRIK S.R.L.":"dielectrik","DKC EUROPE S.R.L.":"dkc","DETAS S.P.A.":"detas","SIGENERGY TECHNOLOGY B.V.":"sigenergy sigen",
  "CABUR SRL":"cabur","GO-E":"goe go e","FOXESS":"fox ess","ALPHAMOBILITY":"alpha mobility","MYENERGI":"my energi",
  "ENFHASE ENERGY":"enphase","E-STATION":"estation e station","EVSTORE SRL":"ev store","EMOTION":"e motion","ENERGY S.P.A.":"energy spa zeroco2"};
function piatto(s){ return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim(); }
var GSE_IDX=null;
function indiceGse(){
  if(GSE_IDX) return GSE_IDX;
  var gruppi={}, ordine=[];
  GSE.forEach(function(r){
    var k=r[0]+"|"+r[1];
    if(!gruppi[k]){ gruppi[k]={costruttore:r[0],modello:r[1],versioni:[],gdc:r[9],
      chiave:piatto(r[0]+" "+r[1]+" "+(ALIAS[r[0]]||""))}; ordine.push(k); }
    gruppi[k].versioni.push({versione:r[2],esterno:r[3],alim:r[4],kw:r[5],conn:r[6],prog:r[7],link:r[8],gdc:r[9]});
    gruppi[k].chiave+=" "+piatto(r[2]);
  });
  GSE_IDX=ordine.map(function(k){return gruppi[k]});
  return GSE_IDX;
}
function cercaGse(q){
  q=piatto(q); if(q.length<2) return [];
  var parole=q.split(" ");
  return indiceGse().filter(function(g){
    return parole.every(function(w){ return g.chiave.indexOf(w)>=0; });
  }).slice(0,40);
}
function bloccoRicerca(inEsito){
  var m=S.modello;
  var h='<div class="ricerca">'+
    '<input type="search" id="q-gse" placeholder="marca o modello — es. Enel, BTicino, Prism, Terra AC" autocomplete="off" aria-label="cerca nell\'elenco GSE">'+
    '<div id="ris-gse" class="risultati"></div>';
  if(m) h+='<div class="trovato"><span class="pill buono">Nell\'elenco GSE '+GSE_VERSIONE+'</span> <b>'+esc(m.costruttore)+' '+esc(m.modello)+'</b>'+
    (m.versioni.length>1?' <span class="nota">('+m.versioni.length+' versioni)</span>':'')+' — '+
    m.versioni.map(function(v){ return esc(v.versione)+(v.kw?' · '+esc(v.kw)+' kW':'')+(v.alim?' · '+esc(v.alim).toLowerCase():'')+(v.esterno&&v.esterno!=="-"?' · <em>serve il dispositivo esterno '+esc(v.esterno)+'</em>':''); }).slice(0,4).join(' / ')+
    (m.versioni.length>4?' …':'')+
    (m.versioni[0].link?' <a href="'+esc(m.versioni[0].link)+'" target="_blank" rel="noopener">scheda</a>':'')+
    (m.gdc?'':' <span class="nota">— senza gestione dinamica del carico</span>')+'</div>';
  if(!inEsito){
    h+='<div class="scelte" style="margin-top:1rem">'+
      '<button type="button" class="scelta" data-v="assente" aria-pressed="'+(S.modelloStato==="assente")+'"><span class="segno"></span><span class="testo"><span>Non lo trovo nell\'elenco</span><span class="sub">Vuol dire che per il 2026 il bonus su quel modello non c\'è. Dal 2027 l\'elenco sparisce.</span></span></button>'+
      (fatto()?'':'<button type="button" class="scelta" data-v="nonscelto" aria-pressed="'+(S.modelloStato==="nonscelto")+'"><span class="segno"></span><span class="testo"><span>Non ho ancora scelto</span><span class="sub">Bene: scegli dentro l\'elenco, e fattelo scrivere nel preventivo.</span></span></button>')+
      '</div>';
  }
  h+='<p class="nota" style="margin-top:.9rem">Elenco del GSE, versione <b>'+GSE_VERSIONE+'</b>: '+GSE_COSTRUTTORI+' costruttori, '+GSE_MODELLI+' modelli, '+GSE_RIGHE+' versioni. '+
     'Vale quello <b>vigente alla data della domanda</b>, e il GSE scrive che i dati sono indicativi: fanno fede le schede del costruttore. '+
     'Originali: <a href="'+GSE_PDF_GDC+'" target="_blank" rel="noopener">con gestione dinamica del carico</a> · <a href="'+GSE_PDF_NOGDC+'" target="_blank" rel="noopener">senza</a> · <a href="'+GSE_PAGINA+'" target="_blank" rel="noopener">pagina GSE</a>.</p></div>';
  return h;
}
function attaccaRicerca(inEsito, dopoScelta){
  var q=document.getElementById("q-gse"), out=document.getElementById("ris-gse");
  if(!q) return;
  var disegna=function(){
    var r=cercaGse(q.value);
    if(piatto(q.value).length<2){ out.innerHTML=""; return; }
    if(!r.length){ out.innerHTML='<p class="nota vuoto">Nessun modello con «'+esc(q.value)+'» nell\'elenco di '+GSE_VERSIONE+'. Prova con la sola marca, o controlla la scritta sul dispositivo. Se non c\'è nemmeno così, per il 2026 quel modello non prende il bonus.</p>'; return; }
    out.innerHTML=r.map(function(g,i){
      return '<button type="button" class="ris" data-i="'+i+'"><b>'+esc(g.costruttore)+'</b> '+esc(g.modello)+
        '<span class="sub">'+g.versioni.length+(g.versioni.length===1?' versione':' versioni')+
        (g.versioni[0].kw?' · '+esc(g.versioni[0].kw)+' kW':'')+(g.gdc?'':' · senza GDC')+'</span></button>';
    }).join("");
    Array.prototype.forEach.call(out.querySelectorAll(".ris"),function(b){
      b.addEventListener("click",function(){
        S.modello=r[parseInt(b.getAttribute("data-i"),10)]; S.modelloStato="trovato";
        if(dopoScelta) dopoScelta();
      });
    });
  };
  q.addEventListener("input",disegna);
  if(!inEsito) q.focus();
  Array.prototype.forEach.call(document.querySelectorAll('.ricerca .scelta'),function(b){
    b.addEventListener("click",function(){
      S.modello=null; S.modelloStato=b.getAttribute("data-v");
      if(dopoScelta) dopoScelta();
    });
  });
}

/* ==================== IL PASSO ==================== */
function disegnaPasso(){
  var lista=attivi(); if(idx>=lista.length){ disegnaEsito(); return; }
  if(idx<0) idx=0;
  var p=lista[idx];
  document.getElementById("wrap").className="wrap";
  document.getElementById("contatore").textContent="Domanda "+(idx+1)+" di "+lista.length;
  document.getElementById("indietro-top").hidden = idx===0;
  document.getElementById("barra").style.width=(idx/lista.length*100)+"%";

  var h='<div class="domanda"><h1>'+val(p.titolo)+'</h1><p class="aiuto">'+val(p.aiuto)+'</p>';
  if(p.tipo==="numero"){
    h+='<div class="numerico"><input type="number" id="in-num" min="'+(p.min||0)+'" step="1" value="'+S[p.campo]+'" aria-label="'+p.unita+'" inputmode="numeric">'+
       '<div class="unita"><span class="etichetta">'+p.unita+'</span></div></div><p class="nota" id="conv"></p>';
  }else if(p.tipo==="ricerca"){
    h+=bloccoRicerca(false);
  }else{
    h+='<div class="scelte">';
    val(p.opzioni).forEach(function(o){
      var sel = S[p.campo]===o.v;
      h+='<button type="button" class="scelta" data-v="'+o.v+'" aria-pressed="'+sel+'">'+
         '<span class="segno"></span><span class="testo"><span>'+o.t+'</span>'+
         (o.s?'<span class="sub">'+o.s+'</span>':'')+'</span></button>';
    });
    h+='</div>';
  }
  h+='<div class="navi">';
  if(idx>0) h+='<button type="button" class="btn piatto" id="indietro">Indietro</button>';
  if(p.tipo!=="singola") h+='<button type="button" class="btn primario" id="avanti">Avanti</button>';
  h+='</div></div>';
  document.getElementById("palco").innerHTML=h;

  if(p.tipo==="numero"){
    var inpN=document.getElementById("in-num");
    var convN=function(){
      S[p.campo]=Math.max(p.min||0,parseFloat(inpN.value)||0);
      var c=document.getElementById("conv");
      if(p.id==="spesa") c.textContent="L'"+num(S.perc)+"% fa "+eur(S.spesa*S.perc/100)+(S.spesa*S.perc/100>tetto()?", ma il tetto è "+eur(tetto())+": il contributo si ferma lì.":". Sotto il tetto di "+eur(tetto())+".");
      if(p.id==="partecipanti") c.textContent= S.partecipanti<=8 ? "Fino a otto partecipanti la domanda può presentarla anche un condomino delegato." : "Sopra gli otto partecipanti la domanda la presenta solo l'amministratore.";
    };
    inpN.addEventListener("input",convN); convN(); inpN.focus(); inpN.select();
    inpN.addEventListener("keydown",function(e){ if(e.key==="Enter"){ idx++; disegnaPasso(); } });
    document.getElementById("avanti").addEventListener("click",function(){ idx++; disegnaPasso(); });
  }else if(p.tipo==="ricerca"){
    attaccaRicerca(false,function(){ idx++; disegnaPasso(); });
    var av=document.getElementById("avanti");
    av.disabled=!S.modelloStato;
    av.addEventListener("click",function(){ idx++; disegnaPasso(); });
  }else{
    Array.prototype.forEach.call(document.querySelectorAll(".scelta"),function(b){
      b.addEventListener("click",function(){
        var v=b.getAttribute("data-v");
        S[p.campo]=v;
        if(p.id==="iscritto"&&v==="no") window.open(CANALE,"_blank","noopener");
        if(p.id==="chi"){ S.residente=null; }
        if(p.id==="fase"){ S.quando=null; S.precedenti=null; }
        if(p.id==="quando"||p.id==="quandoPrima"){ if(!annualita2026()){ S.modello=null; S.modelloStato=null; } }
        idx++; disegnaPasso();
      });
    });
  }
  var ind=document.getElementById("indietro");
  if(ind) ind.addEventListener("click",function(){ idx--; disegnaPasso(); });
  window.scrollTo(0,0);
}

/* ==================== I CANCELLI ====================
   Ogni cancello restituisce {stato, titolo, testo, fonte}.
   stato: "ok" | "attenzione" (si sistema) | "ko" (non si sistema) | "dopo" (fuori dal 2026, dentro dal 2027) */
function C(stato,titolo,testo,fonte){ return {stato:stato,titolo:titolo,testo:testo,fonte:fonte}; }

function cancelli(){
  var L=[], f=fatto(), c=condo();
  /* 1. soggetto */
  if(S.chi==="impresa") L.push(C("ko","Chi chiede","Il contributo è riservato alle persone fisiche residenti in Italia e ai condomìni. Un'impresa, una partita IVA o una ditta individuale non possono chiederlo: non è una lettura, è il testo del decreto. Per i veicoli commerciali delle PMI lo stesso DPCM prevede altri contributi, ma non per la ricarica.","DPCM 10/06/2026 art. 6 c. 1; DD 4/08/2026 art. 1"));
  else if(S.chi==="privato"&&S.residente==="no") L.push(C("ko","Residenza","Il decreto chiede che la persona fisica sia residente in Italia. Senza residenza la domanda non è ammissibile.","DD 4/08/2026 art. 1 c. 1"));
  else L.push(C("ok","Chi chiede", c?"Un condominio, per le parti comuni: è uno dei due soggetti ammessi.":"Persona fisica residente in Italia: sei uno dei due soggetti ammessi.","DPCM 10/06/2026 art. 6 c. 1"));
  if(fuoriSubito()) return L;

  /* 2. quando */
  if(S.quando==="prima2606") L.push(C("ko","Data di completamento","Le spese ammissibili partono dal "+SPESE_DAL+", giorno in cui è entrato in vigore il DPCM. Un'installazione finita prima non rientra, anche se pagata dopo.","DD 4/08/2026 art. 3 c. 1"));
  else if(S.quando==="2027") L.push(C("dopo","Data di completamento","Lo sportello che apre il 22 settembre copre le installazioni completate fra il "+SPESE_DAL+" e il "+FINE_2026+". Chi finisce nel 2027 aspetta lo sportello dell'annualità 2027, che il Ministero aprirà con un decreto apposta. Cambia una regola: non serve più che il modello sia nell'elenco GSE, ma serve l'attestazione dell'installatore sui requisiti tecnici, allegata alla dichiarazione di conformità.","DD 4/08/2026 art. 3 c. 1 e art. 4 c. 1 lett. e"));
  else if(S.quando==="nonso") L.push(C("attenzione","Data di completamento","Decidi con l'installatore quando finisce, e mettilo per iscritto. Entro il "+FINE_2026+" sei nell'annualità 2026, e la domanda va fatta prima che i 15 milioni finiscano. Dal 1° gennaio 2027 cambia sportello e cambia la regola sul dispositivo.","DD 4/08/2026 art. 3 c. 1"));
  else L.push(C("ok","Data di completamento",(f?"Installazione completata":"Installazione da completare")+" fra il "+SPESE_DAL+" e il "+FINE_2026+": è l'annualità 2026, quella dello sportello che apre il 22 settembre.","DD 11/09/2026 (sportello) art. 1"));

  /* 3. condominio */
  if(c){
    if(S.ruolo==="delegato"&&S.partecipanti>8) L.push(C("ko","Chi presenta","Un condomino delegato può presentare la domanda solo nei condomìni fino a otto partecipanti. Con "+S.partecipanti+" partecipanti la presenta l'amministratore pro tempore, che deve dichiarare di avere i requisiti dell'art. 71-bis delle disposizioni di attuazione del codice civile.","DD 4/08/2026 art. 6 c. 7 lett. b"));
    else if(S.ruolo==="condomino") L.push(C("attenzione","Chi presenta","La domanda la presenta l'amministratore"+(S.partecipanti<=8?" oppure, essendo al massimo otto partecipanti, un condomino delegato dall'assemblea":"")+". Tu puoi portare in assemblea questa pagina e la checklist in fondo.","DD 4/08/2026 art. 6 c. 7 lett. b"));
    else L.push(C("ok","Chi presenta",S.ruolo==="delegato"?"Condomino delegato in un condominio fino a otto partecipanti: puoi presentare tu.":"L'amministratore pro tempore presenta la domanda e dichiara i requisiti dell'art. 71-bis disp. att. c.c.","DD 4/08/2026 art. 6 c. 7 lett. b"));
    if(S.delibera==="no") L.push(C(f?"attenzione":"attenzione","Delibera","Senza delibera assembleare che autorizza i lavori sulle parti comuni la domanda non si può presentare. Convocate l'assemblea, deliberate, e poi lasciate passare i trenta giorni per l'impugnazione: l'amministratore deve dichiarare che non ce ne sono state.","DD 4/08/2026 art. 6 c. 7 lett. c; art. 1137 c.c."));
    else if(S.delibera==="fresca") L.push(C("attenzione","Delibera","La delibera c'è, ma serve anche la dichiarazione che non è stata impugnata nei termini dell'art. 1137 c.c., cioè trenta giorni. Aspettate che passino, o che l'impugnazione si chiuda, prima di presentare.","DD 4/08/2026 art. 6 c. 7 lett. c"));
    else L.push(C("ok","Delibera","Delibera approvata e non impugnata nei termini: si allega con la dichiarazione dell'amministratore.","DD 4/08/2026 art. 6 c. 7 lett. c"));
    if(S.uso==="pubblico") L.push(C("ko","Uso","Nel condominio l'infrastruttura deve essere a uso collettivo dei condòmini. Se è accessibile a persone esterne, con o senza pagamento, è un'infrastruttura aperta al pubblico e questo bonus non la copre.","DD 4/08/2026 art. 4 c. 2-3"));
    else L.push(C("ok","Uso","Uso collettivo dei condòmini, non aperto al pubblico.","DD 4/08/2026 art. 4 c. 3"));
  } else {
    if(S.luogo==="pubblico") L.push(C("ko","Dove sta","Il dispositivo deve essere a uso esclusivamente privato e non accessibile al pubblico. Un posto aperto a chi passa non rientra.","DD 4/08/2026 art. 4 c. 2"));
    else if(S.luogo==="comuni") L.push(C("attenzione","Dove sta","Sulle parti comuni la domanda la presenta il condominio, non tu: con delibera, tramite l'amministratore, e con il tetto di "+eur(S.tettoCondo)+" invece di "+eur(S.tettoPriv)+". Rifai il percorso scegliendo «il condominio», oppure, se il posto auto è nella tua esclusiva disponibilità, scegli «in un posto mio».","DPCM 10/06/2026 art. 6 c. 1; DD 4/08/2026 art. 6 c. 7"));
    else L.push(C("ok","Dove sta","Area nella tua piena disponibilità, uso privato. Anche nella seconda casa: il decreto non lo esclude.","DD 4/08/2026 art. 4 c. 1 lett. b e c. 2"));
  }

  /* 4. dispositivo nuovo */
  if(S.nuovo==="no") L.push(C("ko","Dispositivo","Il decreto chiede un dispositivo nuovo di fabbrica. Usato, ricondizionato o da esposizione non passano.","DD 4/08/2026 art. 4 c. 1 lett. a"));
  else L.push(C("ok","Dispositivo",S.nuovo==="nonso"?"Quando lo scegli: nuovo di fabbrica, e fattelo scrivere in fattura.":"Nuovo di fabbrica.","DD 4/08/2026 art. 4 c. 1 lett. a"));

  /* 5. installatore */
  if(S.installatore==="fai") L.push(C(f?"ko":"attenzione","Installatore",(f?"Senza la dichiarazione di conformità dell'art. 7 del DM 37/2008 la domanda è improcedibile, e quel documento lo può rilasciare solo un'impresa abilitata che ha fatto il lavoro.":"Non farlo da solo. Serve la dichiarazione di conformità dell'art. 7 del DM 37/2008, e la firma solo un'impresa abilitata che fa l'installazione.")+" Non è una formalità: attesta che l'impianto è a norma.","DD 4/08/2026 art. 4 c. 1 lett. c; art. 6 c. 7 lett. f"));
  else if(S.installatore==="nonso") L.push(C("attenzione","Installatore","Scegli un'impresa abilitata e chiedile prima se rilascia la dichiarazione di conformità del DM 37/2008. Se esita, cambia impresa.","DD 4/08/2026 art. 4 c. 1 lett. c"));
  else L.push(C("ok","Installatore","Impresa abilitata con dichiarazione di conformità DM 37/2008: è il documento che attesta anche l'avvenuta installazione.","DD 4/08/2026 art. 6 c. 7 lett. f"));

  /* 6. modello in elenco (solo 2026) */
  if(annualita2026()){
    if(S.modelloStato==="trovato") L.push(C("ok","Modello",S.modello.costruttore+" "+S.modello.modello+" è nell'elenco GSE di "+GSE_VERSIONE+(S.modello.gdc?", con gestione dinamica del carico":", nell'elenco dei dispositivi senza gestione dinamica del carico")+". Alla domanda vale l'elenco vigente in quel giorno: ricontrollalo sulla pagina del GSE prima di inviare.","DD 4/08/2026 art. 4 c. 1 lett. d; delibera ARERA 541/2020 art. 4"));
    else if(S.modelloStato==="assente") L.push(C(f?"ko":"attenzione","Modello",f?"Se il modello non è nell'elenco GSE vigente alla data della domanda, per l'annualità 2026 il contributo non c'è. Controlla ancora la scritta esatta sul dispositivo e la scheda del costruttore, e guarda se il GSE ha pubblicato un aggiornamento: l'elenco di "+GSE_VERSIONE+" potrebbe non essere l'ultimo. Se resta fuori, dal 2027 l'elenco non serve più — ma questa installazione è del 2026.":"Scegli un modello che sta nell'elenco, e fattelo scrivere nel preventivo. Un dispositivo fuori elenco può essere ottimo e a norma, ma per il 2026 non prende il bonus.","DD 4/08/2026 art. 4 c. 1 lett. d"));
    else L.push(C("attenzione","Modello","Quando scegli, scegli dentro l'elenco GSE, e fai scrivere marca e modello esatti nel preventivo e in fattura. Qui sopra puoi cercare.","DD 4/08/2026 art. 4 c. 1 lett. d"));
  }

  /* 7. fattura */
  if(S.fattura==="altro") L.push(C(f?"ko":"attenzione","Fattura",f?"La fattura è intestata a un'altra persona, e il pagamento deve venire dal conto di chi chiede il contributo. Con una fattura a nome di un altro la domanda è persa. Se il fornitore accetta una nota di credito e una nuova fattura a tuo nome, e paghi tu dal tuo conto, si può ancora sistemare: chiedilo prima di presentare.":"La fattura deve essere intestata a chi chiede il contributo"+(c?" (il condominio, con il suo codice fiscale)":"")+", e il pagamento deve partire dal suo conto. Dillo prima che la emettano.","DD 4/08/2026 art. 6 c. 7 lett. d-e"));
  else if(S.fattura==="cartacea") L.push(C("attenzione","Fattura","La fattura cartacea è ammessa solo se il fornitore è esonerato dall'obbligo di fattura elettronica, e devi provarlo. Se non lo è, chiedi la fattura elettronica: quella la scarichi in XML dal portale dell'Agenzia delle Entrate, ed è il formato che la piattaforma vuole.","DD 4/08/2026 art. 6 c. 7 lett. d"));
  else if(S.fattura==="nonho") L.push(C("ko","Fattura","Senza fattura non c'è domanda. Chiedila al fornitore: elettronica, a tuo nome, con la descrizione di dispositivo e posa. Se il lavoro è stato fatto senza fattura, non c'è modo di rientrare.","DD 4/08/2026 art. 6 c. 7 lett. d"));
  else if(S.fattura==="nonancora") L.push(C("attenzione","Fattura","Quando la chiedi: elettronica, intestata a "+(c?"al condominio con il suo codice fiscale":"te")+", con marca e modello del dispositivo e la posa in opera scritti sopra. La scaricherai in XML dal portale dell'Agenzia delle Entrate.","DD 4/08/2026 art. 6 c. 7 lett. d"));
  else L.push(C("ok","Fattura","Fattura elettronica intestata a chi chiede: si allega il file XML scaricato dal portale dell'Agenzia delle Entrate, non il PDF di cortesia.","DD 4/08/2026 art. 6 c. 7 lett. d"));

  /* 8. pagamento */
  if(S.pagamento==="contanti") L.push(C(f?"ko":"attenzione","Pagamento",f?"Il pagamento in contanti non è tracciabile e il decreto lo esclude. Non si può rimediare a posteriori.":"Non pagare in contanti: solo bonifico, SCT o carta dal tuo conto.","DD 4/08/2026 art. 3 c. 4; art. 6 c. 7 lett. e"));
  else if(S.pagamento==="rate") L.push(C(f?"ko":"attenzione","Pagamento",f?"Il decreto vieta il pagamento tramite finanziamento, anche a tasso zero. È il vincolo che taglia fuori più persone e che nessuno dice al banco.":"Niente finanziamento, nemmeno il «tasso zero» del negozio o del concessionario: il decreto lo vieta. Se ti servono i soldi, meglio un prestito personale slegato dalla fattura e pagare tu con bonifico — ma è una scelta tua, e la pagina non dà consigli finanziari.","DD 4/08/2026 art. 3 c. 4"));
  else if(S.pagamento==="altro") L.push(C(f?"ko":"attenzione","Pagamento",f?"Il pagamento deve partire da un conto intestato a chi chiede il contributo. Dal conto di un'altra persona non vale, anche se la fattura è a tuo nome.":"Paga dal "+(c?"conto del condominio":"tuo conto")+", non da quello di un familiare.","DD 4/08/2026 art. 6 c. 7 lett. e"));
  else if(S.pagamento==="nonancora") L.push(C("attenzione","Pagamento","Quando paghi: bonifico, SEPA Credit Transfer o carta "+(c?"del condominio":"a tuo nome")+", dal "+(c?"conto condominiale":"tuo conto")+". Conserva l'estratto conto: si allega quello, o la lista movimenti timbrata e firmata dalla banca.","DD 4/08/2026 art. 6 c. 7 lett. e"));
  else L.push(C("ok","Pagamento","Pagamento tracciato dal conto di chi chiede. Si allega l'estratto conto (o la lista movimenti timbrata e firmata dalla banca) con i movimenti evidenziati.","DD 4/08/2026 art. 6 c. 7 lett. e"));

  /* 9. cumulo */
  if(S.cumulo==="si") L.push(C("ko","Cumulo","Il contributo non si somma a nessun'altra agevolazione sulla stessa spesa, nemmeno fiscale. Devi scegliere: o rinunci all'altra (se puoi ancora farlo, per esempio non portandola in dichiarazione) o rinunci a questa. Se prendi entrambe, i controlli a campione portano alla revoca e alla restituzione entro sessanta giorni. Il conto qui sotto ti dice quale delle due vale di più.","DD 4/08/2026 art. 2 c. 3; DD 11/09/2026 (controlli)"));
  else if(S.cumulo==="nonso") L.push(C("attenzione","Cumulo","Chiedi a chi ti fa la dichiarazione dei redditi se quella fattura è già stata messa in detrazione insieme ad altri lavori. Se sì, non si può chiedere anche il bonus sulla stessa spesa.","DD 4/08/2026 art. 2 c. 3"));
  else L.push(C("ok","Cumulo","Nessun'altra agevolazione sulla stessa spesa. Ricorda che vale anche per il futuro: quella fattura non va in detrazione.","DD 4/08/2026 art. 2 c. 3"));

  /* 10. domande precedenti */
  if(f){
    if(S.precedenti==="due") L.push(C("ko","Domande precedenti","Dopo due domande dichiarate improcedibili l'accesso al contributo è definitivamente precluso.","DD 4/08/2026 art. 6 c. 5"));
    else if(S.precedenti==="aperta") L.push(C("ko","Domande precedenti","È ammessa una sola domanda per soggetto. Finché la prima è in istruttoria non se ne può presentare un'altra; se viene dichiarata improcedibile, avrai una seconda e ultima possibilità.","DD 4/08/2026 art. 6 c. 4"));
    else if(S.precedenti==="una") L.push(C("attenzione","Domande precedenti","È la tua seconda e ultima possibilità: se anche questa è improcedibile, il bonus è chiuso. Controlla ogni allegato due volte prima di inviare.","DD 4/08/2026 art. 6 c. 4-5"));
    else L.push(C("ok","Domande precedenti","Prima domanda. Ne hai una di riserva solo se questa viene dichiarata improcedibile: meglio non usarla.","DD 4/08/2026 art. 6 c. 4"));
  }

  /* 11. strumenti */
  if(S.strumenti==="entrambi") L.push(C("ok","SPID e PEC","Si entra con SPID, CIE o CNS; la PEC deve restare attiva fino all'erogazione: le richieste di integrazione arrivano lì, con dieci giorni per rispondere.","DD 4/08/2026 art. 6 c. 6-7; DD 11/09/2026 (controlli) art. 3"));
  else L.push(C("attenzione","SPID e PEC",(S.strumenti==="nopec"?"Ti manca la PEC. ":S.strumenti==="nospid"?"Ti manca SPID o CIE. ":"Ti mancano SPID e PEC. ")+
    "Senza SPID, CIE o CNS non entri sulla piattaforma; senza PEC la domanda non è completa e non ricevi le comunicazioni. Si attivano in pochi giorni, ma non il giorno stesso: fallo adesso, prima che il fondo si consumi.","DD 4/08/2026 art. 6 c. 6-7"));

  return L;
}

function verdetto(L){
  var ko=L.filter(function(x){return x.stato==="ko"}), dopo=L.filter(function(x){return x.stato==="dopo"}), att=L.filter(function(x){return x.stato==="attenzione"});
  if(ko.length) return {tipo:"ko", titolo: fatto()||fuoriSubito() ? "Fuori" : "Così com'è, fuori", ko:ko, att:att, dopo:dopo};
  if(dopo.length) return {tipo:"dopo", titolo:"Non in questo sportello", ko:ko, att:att, dopo:dopo};
  if(att.length) return {tipo:"att", titolo: att.length===1 ? "Dentro, con una cosa da sistemare" : "Dentro, con "+att.length+" cose da sistemare", ko:ko, att:att, dopo:dopo};
  return {tipo:"ok", titolo: fatto() ? "Dentro" : "Sulla strada giusta", ko:ko, att:att, dopo:dopo};
}

/* ==================== IL CONTO ==================== */
function conto(){
  var spesa=Math.max(0,S.spesa||0);
  var lordo=spesa*S.perc/100, contributo=Math.min(lordo,tetto());
  var soglia=tetto()/(S.perc/100);           /* spesa oltre la quale il tetto morde */
  var detr=spesa*aliqDetr()/100, rata=detr/S.rate;
  return {spesa:spesa,lordo:lordo,contributo:contributo,tagliato:lordo>contributo,soglia:soglia,
          resta:spesa-contributo,detr:detr,rata:rata,aTesta: condo()&&S.partecipanti>0 ? contributo/S.partecipanti : null,
          spesaTesta: condo()&&S.partecipanti>0 ? spesa/S.partecipanti : null};
}

/* ==================== LA CORSA ==================== */
function corsa(){
  var ora=new Date();
  var stato = ora<APRE ? "prima" : ora<CHIUDE ? "aperto" : "chiuso";
  var giorni = stato==="prima" ? Math.ceil((APRE-ora)/86400000) : stato==="aperto" ? Math.floor((ora-APRE)/86400000) : 0;
  var domandeStimate = S.ticket>0 ? Math.floor(S.dotazione/S.ticket) : 0;
  /* al ritmo del 2024 (5.319 domande nel primo mese su 20 M€), riscalato alla dotazione */
  var mesi = DOMANDE_2024_MESE1>0 ? domandeStimate/DOMANDE_2024_MESE1 : 0;
  var erogazione=new Date(CHIUDE.getTime()+EROGA_GIORNI*86400000);
  return {stato:stato,giorni:giorni,domande:domandeStimate,mesi:mesi,erogazione:erogazione,
          quota: S.arrivate!==null&&domandeStimate>0 ? S.arrivate/domandeStimate*100 : null};
}

/* ==================== L'ESITO ==================== */
var ricalcoloInCoda=null;
function ricalcola(){
  if(ricalcoloInCoda) return;
  ricalcoloInCoda=setTimeout(function(){ ricalcoloInCoda=null; disegnaEsito(true); },50);
}
function pill(stato){
  return stato==="ok"?'<span class="pill buono">passa</span>':stato==="attenzione"?'<span class="pill giallo">da sistemare</span>':stato==="dopo"?'<span class="pill giallo">dal 2027</span>':'<span class="pill attenzione">non passa</span>';
}
function cardCancello(x){
  return '<div class="conf'+(x.stato==="ko"?" ko":x.stato==="ok"?"":" att")+'"><div class="cap"><span class="nome">'+x.titolo+'</span>'+pill(x.stato)+'</div>'+
    '<p class="riassunto">'+x.testo+'</p><p class="fonte-riga">'+esc(x.fonte)+'</p></div>';
}
function ipCampo(id,lab,val,step,fonte,attrs){
  return '<div class="ip"><label for="ip-'+id+'">'+lab+'</label>'+
         '<input type="number" id="ip-'+id+'" value="'+val+'" step="'+step+'" min="0" inputmode="decimal" autocomplete="off"'+(attrs||"")+'>'+
         '<span class="fonte">'+fonte+'</span></div>';
}

function bloccoSopra(){
  var L=cancelli(), V=verdetto(L), K=conto(), R=corsa();
  var h='<div class="taglia-box'+(V.tipo==="ko"?" ko":V.tipo==="ok"?" ok":"")+'"><p class="occhiello">'+(fatto()?"Il controllo, fatto prima":"Prima di comprare")+'</p>'+
    '<p class="taglia">'+V.titolo+'</p><p class="spiega">';
  if(V.tipo==="ko") h+=(V.ko.length===1?"C'è un punto che non passa":"Ci sono "+V.ko.length+" punti che non passano")+", e "+(fatto()?"a installazione fatta non si sistema":"va cambiato prima di comprare")+". "+(fatto()?"È scritto sotto, con l'articolo. Prima di rinunciare leggi se c'è una via d'uscita: in qualche caso c'è.":"Sotto c'è cosa, e come farlo bene.");
  else if(V.tipo==="dopo") h+="L'installazione finisce nel 2027: per te non vale lo sportello del 22 settembre ma quello successivo, con regole in parte diverse. Il resto del controllo vale lo stesso.";
  else if(V.tipo==="att") h+="I requisiti che non si possono cambiare li hai. "+(V.att.length===1?"Resta una cosa":"Restano "+V.att.length+" cose")+" da sistemare prima di "+(fatto()?"inviare":"comprare")+", e sono scritte sotto.";
  else h+= fatto() ? "Hai tutti i requisiti che il decreto chiede. Ora conta arrivare allo sportello con i documenti giusti, e presto: sotto c'è la lista, e il perché della fretta." : "Se fai le cose come le hai dette qui, arrivi allo sportello con una domanda che regge. La lista delle cose da dire all'installatore è in fondo, da stampare.";
  h+='</p></div>';

  if(fuoriSubito()){ L.forEach(function(x){ h+=cardCancello(x); }); return h; }

  h+='<p class="occhiello" style="margin-top:2rem">I cancelli, uno per uno</p>';
  L.forEach(function(x){ h+=cardCancello(x); });

  /* ---- il conto ---- */
  h+='<div class="carta" style="margin-top:2rem"><p class="occhiello">Il conto</p><h2>'+eur(K.contributo)+(condo()&&K.aTesta!==null?' al condominio, '+eur(K.aTesta)+' a famiglia':' di contributo')+'</h2>'+
    '<div class="scroll"><table><tr><th>Voce</th><th>Importo</th></tr>'+
    '<tr><td>Spesa dichiarata, acquisto e posa</td><td class="val">'+eur(K.spesa)+'</td></tr>'+
    '<tr><td>L\''+num(S.perc)+'%</td><td class="val">'+eur(K.lordo)+'</td></tr>'+
    '<tr><td>Tetto '+(condo()?'per le parti comuni condominiali':'per persona fisica')+'</td><td class="val">'+eur(tetto())+'</td></tr>'+
    '<tr class="forte"><td>Contributo'+(K.tagliato?' (fermato dal tetto)':'')+'</td><td class="val">'+eur(K.contributo)+'</td></tr>'+
    '<tr><td>Resta a '+(condo()?'carico del condominio':'te')+'</td><td class="val">'+eur(K.resta)+(condo()&&K.spesaTesta!==null?' <span class="nota">('+eur(K.resta/S.partecipanti)+' a famiglia)</span>':'')+'</td></tr>'+
    '</table></div>';
  h+='<p>'+(K.tagliato
    ? '<strong>Il tetto morde.</strong> Sopra i '+eur(K.soglia)+' di spesa l\''+num(S.perc)+'% supera il massimale e il contributo si ferma a '+eur(tetto())+': ogni euro in più lo paghi tu per intero.'
    : '<strong>Sei sotto il tetto</strong>: fino a '+eur(K.soglia)+' di spesa il contributo resta l\''+num(S.perc)+'% pieno.')+'</p>';
  h+='<p><strong>Il confronto che nessuno fa.</strong> Il bonus non si somma a nessun\'altra agevolazione sulla stessa fattura. Se quella spesa potesse andare in una detrazione al '+num(aliqDetr())+'% in '+S.rate+' rate — <em>è un\'ipotesi per il confronto, non una promessa che ci rientri</em> — varrebbe '+eur(K.detr)+' in tutto, cioè '+eur(K.rata)+' l\'anno per '+S.rate+' anni, e solo se hai abbastanza IRPEF da scontare. '+
    (K.contributo>=K.detr ? 'Qui il contributo ('+eur(K.contributo)+', in una volta) vale di più.' : 'Qui la detrazione ('+eur(K.detr)+', ma in dieci anni) varrebbe di più sulla carta: il tetto ha già tagliato il contributo, e il confronto va fatto sulla tua situazione fiscale.')+'</p>';
  h+='<p><strong>Quando arrivano i soldi.</strong> L\'erogazione è in unica soluzione entro '+EROGA_GIORNI+' giorni dalla chiusura dello sportello, con un decreto cumulativo: chi fa domanda il 22 settembre non vede un euro prima della <b>primavera 2027</b> (chiusura il '+data(CHIUDE)+', più '+EROGA_GIORNI+' giorni: intorno al '+data(R.erogazione)+'). Se lo sportello chiude prima per esaurimento, i termini si accorciano di conseguenza.</p>';
  h+='<p class="nota">Costi ammessi: acquisto e posa, opere elettriche ed edili strettamente necessarie, dispositivi di gestione, progettazione, direzione lavori, collaudo, e la connessione con un nuovo contatore. Fuori: imposte, consulenze diverse, autorizzazioni edilizie, esercizio. — DD 4/08/2026 art. 3.</p></div>';

  /* ---- la corsa ---- */
  h+='<div class="carta rilievo" style="margin-top:1.25rem"><p class="occhiello">La corsa</p>';
  if(R.stato==="prima") h+='<h2>Lo sportello apre fra '+R.giorni+(R.giorni===1?' giorno':' giorni')+'</h2><p>Martedì <b>22 settembre 2026 alle 12:00</b>. Chiusura formale il 31 gennaio 2027 alle 12:00 — <b>o prima, appena finiscono i soldi</b>. L\'istruttoria è in ordine di arrivo.</p>';
  else if(R.stato==="aperto") h+='<h2>Sportello aperto da '+R.giorni+(R.giorni===1?' giorno':' giorni')+'</h2><p>Dal 22 settembre 2026 alle 12:00. Chiusura formale il 31 gennaio 2027 — <b>o prima, appena finiscono i soldi</b>. L\'istruttoria è in ordine di arrivo.</p>';
  else h+='<h2>Lo sportello 2026 è chiuso</h2><p>Si è chiuso il 31 gennaio 2027 alle 12:00, o prima per esaurimento delle risorse. Per le installazioni completate nel 2027 si aspetta il decreto che apre l\'annualità successiva.</p>';
  h+='<div class="scroll"><table><tr><th>Voce</th><th>Valore</th></tr>'+
    '<tr><td>Dotazione 2026</td><td class="val">'+eur(S.dotazione)+'</td></tr>'+
    '<tr><td>Contributo medio chiesto nel 2024</td><td class="val">'+eur(S.ticket)+'</td></tr>'+
    '<tr class="forte"><td>Domande che i soldi possono coprire, a quel ticket</td><td class="val">circa '+num(R.domande)+'</td></tr>'+
    '<tr><td>Domande arrivate nel primo mese del 2024 (su 20 milioni)</td><td class="val">'+num(DOMANDE_2024_MESE1)+'</td></tr>'+
    '<tr><td>A quel ritmo, i fondi 2026 durano</td><td class="val">circa '+num(R.mesi,1)+' mesi</td></tr>'+
    (S.arrivate!==null?'<tr class="forte"><td>Domande arrivate'+(DOMANDE_ARRIVATE_AL?' al '+DOMANDE_ARRIVATE_AL:'')+'</td><td class="val">'+num(S.arrivate)+' ('+num(R.quota,0)+'% dei fondi, al ticket 2024)</td></tr>':'<tr><td>Domande arrivate a questo sportello</td><td class="val">nessun dato ufficiale ancora pubblicato</td></tr>')+
    '</table></div>'+
    '<p><strong>Perché «è una corsa, non una scadenza».</strong> La dotazione 2026 è un quarto più piccola di quella del 2024 e le auto elettriche in circolazione sono di più. Al ritmo del 2024 i quindici milioni finiscono <b>molto prima del 31 gennaio</b>: la data vera non è quella scritta sul decreto, è il giorno in cui si esauriscono i fondi, e quel giorno non lo annuncia nessuno in anticipo. Questa è un\'<em>elaborazione mia</em> su un solo dato storico: può andare meglio o peggio, ma è l\'unico conto che si può fare con i numeri pubblici.</p>'+
    '<p class="nota">Fonti: DD 11/09/2026 (sportello) art. 2-3 per dotazione, date e ordine cronologico; comunicato MIMIT sull\'edizione 2024 per il benchmark. Il ticket medio e la dotazione sono modificabili qui sotto; il numero di domande arrivate si aggiorna quando il Ministero lo pubblica.</p></div>';

  return h;
}

function disegnaEsito(soloRicalcolo){
  var wrap=document.getElementById("wrap");
  wrap.className="wrap largo";
  document.getElementById("contatore").textContent="Il quadro";
  document.getElementById("indietro-top").hidden = false;
  document.getElementById("barra").style.width="100%";
  var h=bloccoSopra();

  if(soloRicalcolo){ document.getElementById("esito-sopra").innerHTML=h; return; }

  var hIp="", hSotto="";
  if(!fuoriSubito()){
    /* ---- ricerca modello anche nell'esito ---- */
    hIp+='<div class="carta" style="margin-top:1.25rem"><p class="occhiello">L\'elenco GSE</p><h2>'+(S.modello?'Controlla un altro modello':'La wallbox è in elenco?')+'</h2>'+
      '<p>Per le installazioni 2026 il modello deve risultare nell\'elenco del GSE vigente alla data della domanda. Qui puoi cercare quello che ti propongono, o quello del vicino.</p>'+bloccoRicerca(true)+'</div>';

    /* ---- parametri ---- */
    hIp+='<div class="carta" style="margin-top:1.25rem"><p class="occhiello">Con che numeri ho fatto il conto</p><h2>Tutti modificabili, tutti con la fonte</h2><div class="griglia-ip">'+
      ipCampo("perc","Percentuale del contributo (%)",S.perc,1,"DPCM 10/06/2026 art. 6 c. 1: 80%")+
      ipCampo("tettopriv","Tetto per persona fisica (€)",S.tettoPriv,50,"DPCM 10/06/2026 art. 6 c. 1: 1.500 €")+
      ipCampo("tettocondo","Tetto per le parti comuni (€)",S.tettoCondo,100,"DPCM 10/06/2026 art. 6 c. 1: 8.000 €")+
      ipCampo("detr","Detrazione ipotetica di confronto (%)",aliqDetr(),1,"L. 199/2025: 50% prima casa, 36% altre, nel 2026. È solo un termine di confronto")+
      ipCampo("rate","Rate della detrazione (anni)",S.rate,1,"Dieci rate annuali di pari importo")+
      ipCampo("ticket","Contributo medio per domanda (€)",S.ticket,10,"Edizione 2024: 6,31 M€ per 5.319 domande, comunicato MIMIT")+
      ipCampo("dotazione","Dotazione dello sportello (€)",S.dotazione,500000,"DD 11/09/2026 art. 2: 15 M€ per il 2026")+
      ipCampo("arrivate","Domande arrivate (se pubblicate)",S.arrivate===null?"":S.arrivate,100,"Nessun dato ufficiale finché MIMIT o Invitalia non lo comunicano",' placeholder="—"')+
      '</div></div>';

    /* ---- checklist ---- */
    hSotto+='<div class="carta" style="margin-top:1.25rem"><p class="occhiello">Da portarsi via</p><h2>'+(fatto()?"I documenti per la domanda, uno per uno":"Le cose da dire all'installatore, prima di firmare")+'</h2>'+
      '<p>'+(fatto()?"La lista degli allegati che la piattaforma chiede a pena di improcedibilità, con dove si prende ognuno e le caselle da spuntare. Più il tuo caso in breve, così com'è uscito qui sopra.":"Sei richieste da fare per iscritto prima di comprare, i documenti da farsi consegnare strada facendo, e il tuo caso in breve.")+
      ' Si stampa o si salva in PDF senza passare da nessun servizio.</p>'+
      '<div class="navi"><button type="button" class="btn primario" id="pdf">Stampa o salva in PDF</button>'+
      '<button type="button" class="btn piatto" id="txt">Scarica in testo semplice</button></div></div>';

    hSotto+='<div class="navi" style="margin-top:1.5rem"><button type="button" class="btn piatto" id="modifica">Cambia una risposta</button>'+
     '<button type="button" class="btn piatto" id="rifai">Ricomincia da capo</button></div>';
  } else {
    hSotto+='<div class="navi" style="margin-top:1.5rem"><button type="button" class="btn piatto" id="rifai">Ricomincia da capo</button></div>';
  }

  hSotto+='<footer><p><strong>Cosa fa questa pagina.</strong> Controlla i requisiti del Bonus colonnine domestiche come sono scritti nel DPCM 10 giugno 2026 e nei decreti direttoriali del 4 agosto e dell\'11 settembre 2026, e ti dice cosa preparare. '+
   'Non dice se il contributo arriverà: quello lo decide lo sportello, in ordine di arrivo, finché ci sono i soldi. Tutte le costanti hanno una fonte e stanno scritte qui sopra; il codice è aperto.</p>'+
   '<p><strong>Chi c\'è dietro.</strong> Gianluca Gualco. Il canale è mio e lo strumento è del canale. Non vendo colonnine, non le installo e non faccio domande per conto terzi: in questa pagina non c\'è niente da comprare e nessuno da contattare.</p>'+
   '<p><strong>Questa pagina non raccoglie niente.</strong> Nessuna mail, nessun modulo, nessun tracciamento, nessun cookie. Non parla mai con la rete: l\'elenco del GSE è dentro il file, e funziona anche senza internet.</p>'+
   '<p><strong>Ha una data.</strong> L\'elenco GSE incorporato è quello di '+GSE_VERSIONE+'; alla domanda vale quello vigente quel giorno. La «relazione finale» citata nelle FAQ di Invitalia non compare né nei decreti 2026 né nella guida alla compilazione della piattaforma (verificato il 24/09/2026): nella checklist non c\'è. Le pagine ufficiali: <a href="'+INVITALIA+'" target="_blank" rel="noopener">Invitalia</a> · <a href="'+MANUALE+'" target="_blank" rel="noopener">manuale della piattaforma</a> · <a href="'+GSE_PAGINA+'" target="_blank" rel="noopener">elenco GSE</a>.</p></footer>';

  document.getElementById("palco").innerHTML='<div id="esito-sopra">'+h+'</div>'+hIp+hSotto;

  [["perc","perc"],["tettopriv","tettoPriv"],["tettocondo","tettoCondo"],["detr","detr"],["rate","rate"],["ticket","ticket"],["dotazione","dotazione"]].forEach(function(c){
    var el=document.getElementById("ip-"+c[0]); if(!el) return;
    el.addEventListener("input",function(e){
      var v=parseFloat(e.target.value);
      if(!isNaN(v)&&v>=0){ S[c[1]]=v; ricalcola(); }
    });
  });
  var ar=document.getElementById("ip-arrivate");
  if(ar) ar.addEventListener("input",function(e){
    var v=parseFloat(e.target.value);
    S.arrivate = isNaN(v)||e.target.value==="" ? null : Math.max(0,v); ricalcola();
  });
  attaccaRicerca(true,function(){ disegnaEsito(); });

  var pdf=document.getElementById("pdf");
  if(pdf) pdf.addEventListener("click",function(){
    document.getElementById("stampa").innerHTML=costruisciReport();
    /* il nome che il browser propone al «salva come PDF» è il titolo del documento
       PIÙ ESTERNO: se la pagina è incorniciata le cornici sono più di una, e il nome
       lo decide l'ultima. Le rinominiamo tutte per la durata della stampa. */
    var salvati=[], w=window;
    for(var i=0;i<6;i++){
      try{ salvati.push({d:w.document,t:w.document.title}); w.document.title=NOMEFILE; }catch(e){}
      if(w===w.top) break;
      w=w.parent;
    }
    window.print();
    setTimeout(function(){ salvati.forEach(function(s){ try{s.d.title=s.t}catch(e){} }); },2000);
  });
  var txt=document.getElementById("txt");
  if(txt) txt.addEventListener("click",function(){
    var blob=new Blob([reportTesto()],{type:"text/plain;charset=utf-8"});
    var a=document.createElement("a");
    a.href=URL.createObjectURL(blob); a.download=NOMEFILE+".txt";
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },1000);
  });
  document.getElementById("rifai").addEventListener("click",function(){
    ["chi","residente","fase","quando","ruolo","delibera","luogo","uso","nuovo","installatore","modello","modelloStato","fattura","pagamento","cumulo","precedenti","strumenti"].forEach(function(k){S[k]=null});
    S.casa="prima"; S.spesa=1600; S.partecipanti=12;
    idx=1; disegnaPasso();
  });
  var mod=document.getElementById("modifica");
  if(mod) mod.addEventListener("click",function(){ idx=attivi().length-1; disegnaPasso(); });
  window.scrollTo(0,0);
}

/* ==================== IL FOGLIO DA PORTARSI VIA ==================== */
function riga(a,b){ return '<tr><td>'+a+'</td><td>'+b+'</td></tr>'; }

/* Gli allegati, come li elenca l'art. 6 c. 7 del DD 4/08/2026, più l'attestazione dei
   requisiti che la guida alla compilazione di Invitalia fa allegare in «Altra documentazione».
   La «relazione finale» delle FAQ non compare né nei decreti né nella piattaforma (verificato il 24/09/2026). */
function documenti(){
  var c=condo(), D=[];
  D.push(["Documento d'identità e codice fiscale", c?"dell'amministratore (o del condomino delegato), in corso di validità.":"tuoi, in corso di validità.","art. 6 c. 7 lett. a"]);
  if(c){
    D.push(["Codice fiscale del condominio","con il documento dell'amministratore e la sua dichiarazione di possedere i requisiti dell'art. 71-bis disp. att. c.c.","art. 6 c. 7 lett. b"]);
    D.push(["Delibera assembleare","che autorizza l'intervento sulle parti comuni, più la dichiarazione dell'amministratore che non è stata impugnata nei termini dell'art. 1137 c.c.","art. 6 c. 7 lett. c"]);
  }
  D.push(["Fattura elettronica in formato XML","scaricata dal portale «Fatture e corrispettivi» dell'Agenzia delle Entrate (accesso con SPID/CIE → Consultazione → Fatture ricevute → scarica il file .xml). Non il PDF che ti manda il fornitore. Intestata "+(c?"al condominio":"a chi chiede")+", con dispositivo e posa descritti. Se cartacea, serve la prova che il fornitore è esonerato.","art. 6 c. 7 lett. d"]);
  D.push(["Estratto conto","o lista dei movimenti timbrata e firmata dalla banca, con il pagamento della fattura evidenziato: bonifico, SEPA Credit Transfer o carta intestata "+(c?"al condominio":"a te")+", dal conto "+(c?"condominiale":"tuo")+". Niente contanti, niente finanziamento.","art. 6 c. 7 lett. e; art. 3 c. 4"]);
  D.push(["Dichiarazione di conformità dell'impianto","rilasciata dall'installatore ai sensi dell'art. 7 del DM 37/2008, che attesta l'avvenuta installazione. Chiedila al momento del collaudo, non dopo.","art. 6 c. 7 lett. f"]);
  if(!annualita2026()) D.push(["Attestazione dell'installatore sui requisiti tecnici","per le annualità dal 2027: allegata alla dichiarazione di conformità, su modello che il Ministero definirà con un provvedimento apposta.","art. 4 c. 1 lett. e"]);
  D.push(["IBAN","di un conto intestato "+(c?"al condominio":"a chi chiede")+": è dove arriva il contributo, in una sola volta.","art. 6 c. 7 lett. g"]);
  D.push(["PEC","attiva e da tenere attiva per tutta la durata del procedimento: le richieste di integrazione arrivano lì e hai dieci giorni per rispondere.","art. 6 c. 7 lett. h"]);
  if(annualita2026()) D.push(["Attestazione dei requisiti dell'infrastruttura di ricarica","il modulo si scarica dalla sezione «Presenta la domanda» della piattaforma e si allega in «Altra documentazione». La guida di Invitalia lo segna come facoltativo, ma è il foglio con cui l'installatore dichiara che la colonnina rispetta i requisiti: fattelo compilare e allegalo. La «relazione finale» che citavano le FAQ, invece, nella piattaforma non c'è.","Guida alla compilazione Invitalia, verificata il 24/09/2026"]);
  D.push(["SPID, CIE o CNS","per entrare sulla piattaforma di Invitalia, all'indirizzo indicato nell'avviso di apertura.","art. 6 c. 6"]);
  return D;
}
var RICHIESTE=[
 ["Il modello è nell'elenco GSE dei dispositivi idonei (delibera ARERA 541/2020), e me lo scrivete nel preventivo con marca e modello esatti.","Per le installazioni 2026 è un requisito a pena di esclusione. L'elenco vigente è sulla pagina del GSE."],
 ["La fattura sarà elettronica, intestata a "+"chi chiede il contributo"+", con dispositivo e posa in opera descritti.","Si allega il file XML scaricato dal portale dell'Agenzia delle Entrate."],
 ["Pago con bonifico, SEPA Credit Transfer o carta, dal mio conto. Nessun finanziamento, nemmeno a tasso zero, nessun contante.","Il decreto vieta il finanziamento e ammette solo pagamenti tracciati da un conto intestato al beneficiario."],
 ["Mi rilasciate la dichiarazione di conformità dell'art. 7 del DM 37/2008 al collaudo.","Senza quel documento la domanda è improcedibile. Lo rilascia solo un'impresa abilitata."],
 ["I lavori finiscono entro il 31 dicembre 2026, con data scritta.","Conta la data di completamento dell'installazione, e per l'annualità 2026 deve stare nell'anno. La domanda va fatta prima che i fondi finiscano."],
 ["Il dispositivo è nuovo di fabbrica e sarà installato in un'area nella mia piena disponibilità, a uso privato.","Requisiti dell'art. 4 del DD 4/08/2026."],
 ["Su questa fattura non chiederò nessun'altra agevolazione, e chi mi fa la dichiarazione dei redditi lo sa.","Il contributo non è cumulabile con altre agevolazioni, anche fiscali, sulla stessa spesa."]
];

function costruisciReport(){
  var d=new Date(), dt=data(d), L=cancelli(), V=verdetto(L), K=conto(), c=condo(), f=fatto();
  var h='<h1>'+(f?"Bonus colonnine domestiche 2026 — i documenti per la domanda":"Bonus colonnine domestiche 2026 — prima di comprare la wallbox")+'</h1>'+
    '<p class="sotto">Foglio preparato il '+dt+' con lo strumento gratuito del canale YouTube «Gianluca Gualco — Energia». Nessun dato è stato raccolto. Fonti: DPCM 10/06/2026, DD MIMIT 4/08/2026 e 11/09/2026, FAQ Invitalia, elenco GSE '+GSE_VERSIONE+'.</p>';

  h+='<h2>Il mio caso, in breve</h2><table><tr><th>Voce</th><th>Risposta</th></tr>'+
    riga("Chi chiede", c?"Il condominio ("+S.partecipanti+" partecipanti), tramite "+(S.ruolo==="delegato"?"condomino delegato":S.ruolo==="amministratore"?"l'amministratore":"l'amministratore (io sono un condomino)"):"Persona fisica residente in Italia")+
    riga("Stato dei lavori", f?"Installazione completata"+(S.quando==="2026"?" fra il 26/06 e il 31/12/2026":S.quando==="2027"?" nel 2027":" prima del 26/06/2026"):"Da completare "+(S.quando==="entro2026"?"entro il 31/12/2026":S.quando==="2027"?"nel 2027":"in data da decidere"))+
    (annualita2026()?riga("Modello", S.modelloStato==="trovato"?S.modello.costruttore+" "+S.modello.modello+" — nell'elenco GSE "+GSE_VERSIONE:S.modelloStato==="assente"?"non trovato nell'elenco GSE "+GSE_VERSIONE:"non ancora scelto"):"")+
    riga("Spesa dichiarata", eur(K.spesa))+
    riga("Contributo atteso", eur(K.contributo)+(K.tagliato?" (fermato dal tetto di "+eur(tetto())+")":" ("+num(S.perc)+"%)")+(K.aTesta!==null?", "+eur(K.aTesta)+" a famiglia":""))+
    riga("Esito del controllo", V.titolo)+
    '</table>';

  h+='<h2>I cancelli</h2><table><tr><th>Requisito</th><th>Esito</th><th>Nota</th></tr>';
  L.forEach(function(x){ h+='<tr><td>'+x.titolo+'</td><td>'+(x.stato==="ok"?"passa":x.stato==="attenzione"?"da sistemare":x.stato==="dopo"?"dal 2027":"NON PASSA")+'</td><td>'+x.testo+' <i>('+esc(x.fonte)+')</i></td></tr>'; });
  h+='</table>';

  if(fuoriSubito()) return h+'<p class="piede">Il contributo è riservato alle persone fisiche residenti in Italia e ai condomìni (DPCM 10/06/2026 art. 6).</p>';

  if(f){
    h+='<h2 class="rompi">Gli allegati, a pena di improcedibilità</h2><p class="guida">Art. 6 c. 7 del DD MIMIT 4/08/2026. Spunta la casella quando il documento è in mano e nel formato giusto.</p>'+
      '<table><tr><th style="width:1cm">✓</th><th>Documento</th><th>Dove si prende, come deve essere</th><th>Fonte</th></tr>';
    documenti().forEach(function(x){ h+='<tr><td>☐</td><td><b>'+x[0]+'</b></td><td>'+x[1]+'</td><td>'+x[2]+'</td></tr>'; });
    h+='</table>';
    h+='<h2>Il giorno della domanda</h2><ol>'+
      '<li>Lo sportello apre <b>martedì 22 settembre 2026 alle 12:00</b> e chiude il 31 gennaio 2027 alle 12:00, <b>o prima se finiscono i 15 milioni</b>. L\'istruttoria è in ordine cronologico di arrivo.</li>'+
      '<li>Si entra sulla piattaforma di Invitalia con SPID, CIE o CNS. L\'indirizzo è nell\'avviso di apertura sulla pagina del bonus; il manuale è su manuali.invitalia.it/bcd26.</li>'+
      '<li>Prima di inviare, ricontrolla che il modello sia nell\'elenco GSE <b>vigente quel giorno</b>: vale quello, non quello di quando hai comprato.</li>'+
      '<li>Alla fine il sistema rilascia una ricevuta con data e ora e un\'attestazione di presentazione in PDF: salvale.</li>'+
      '<li>Le richieste di integrazione arrivano via PEC, con <b>dieci giorni</b> per rispondere. Controlla la PEC ogni giorno.</li>'+
      '<li>Una sola domanda per soggetto. Se viene dichiarata improcedibile se ne può presentare una seconda; alla seconda improcedibilità l\'accesso è chiuso.</li></ol>';
  } else {
    h+='<h2 class="rompi">Le sette cose da farsi confermare per iscritto</h2><p class="guida">Da consegnare a chi vende e a chi installa, prima di firmare il preventivo. Ogni riga ha lo spazio per la risposta.</p><table><tr><th>Richiesta</th><th>Perché</th><th>Risposta</th></tr>';
    RICHIESTE.forEach(function(r){ h+='<tr class="vuoto"><td><b>'+r[0].replace("chi chiede il contributo", c?"il condominio, con il suo codice fiscale":"me")+'</b></td><td>'+r[1]+'</td><td></td></tr>'; });
    h+='</table>';
    h+='<h2>I documenti da farsi consegnare strada facendo</h2><p class="guida">Sono gli allegati che servono il giorno della domanda (DD 4/08/2026 art. 6 c. 7). Meglio raccoglierli mentre si fa il lavoro che cercarli dopo.</p>'+
      '<table><tr><th style="width:1cm">✓</th><th>Documento</th><th>Dove si prende, come deve essere</th></tr>';
    documenti().forEach(function(x){ h+='<tr><td>☐</td><td><b>'+x[0]+'</b></td><td>'+x[1]+'</td></tr>'; });
    h+='</table>';
    h+='<h2>Il calendario</h2><ol>'+
      '<li>Installazione completata <b>entro il 31 dicembre 2026</b> per stare nell\'annualità 2026 (conta la fine lavori, non l\'acquisto).</li>'+
      '<li>Sportello dal <b>22 settembre 2026 alle 12:00</b> al 31 gennaio 2027, <b>o prima se finiscono i 15 milioni</b>: appena hai fattura, pagamento e dichiarazione di conformità, presenta.</li>'+
      '<li>Chi finisce nel 2027 aspetta lo sportello successivo: non serve più l\'elenco GSE, serve l\'attestazione dell\'installatore.</li>'+
      '<li>Erogazione in unica soluzione entro 90 giorni dalla chiusura dello sportello: i soldi arrivano nella primavera successiva, non prima.</li></ol>';
  }

  if(c) h+='<h2>Per il condominio</h2><ul>'+
    '<li>La domanda la presenta l\'amministratore pro tempore; nei condomìni fino a otto partecipanti può farla un condomino delegato.</li>'+
    '<li>Servono la delibera che autorizza i lavori sulle parti comuni e la dichiarazione dell\'amministratore che non è stata impugnata nei termini dell\'art. 1137 c.c. I decreti non fissano un quorum.</li>'+
    '<li>Tetto di '+eur(S.tettoCondo)+' per l\'intervento sulle parti comuni, non per dispositivo. Con '+S.partecipanti+' partecipanti, il contributo atteso è '+eur(K.aTesta)+' a famiglia.</li>'+
    '<li>L\'infrastruttura deve restare a uso collettivo dei condòmini, non aperta al pubblico.</li></ul>';

  h+='<p class="piede">Questo foglio riporta i requisiti come scritti nei decreti alla data del '+dt+'. Non sostituisce la lettura della piattaforma di Invitalia il giorno della domanda, e non garantisce il contributo, che dipende dall\'ordine di arrivo e dai fondi disponibili. Nessun dato è stato raccolto.</p>';
  return h;
}

function reportTesto(){
  var d=document.createElement("div"); d.innerHTML=costruisciReport();
  Array.prototype.forEach.call(d.querySelectorAll("ol"),function(ol){
    Array.prototype.forEach.call(ol.children,function(li,i){ li.insertBefore(document.createTextNode((i+1)+". "),li.firstChild); });
  });
  Array.prototype.forEach.call(d.querySelectorAll("ul"),function(ul){
    Array.prototype.forEach.call(ul.children,function(li){ li.insertBefore(document.createTextNode("— "),li.firstChild); });
  });
  Array.prototype.forEach.call(d.querySelectorAll("h1,h2"),function(el){
    el.insertBefore(document.createTextNode("\n"),el.firstChild);
    var n=Math.min(60,el.textContent.length), tr=""; for(var i=0;i<n;i++) tr+="-";
    el.appendChild(document.createTextNode("\n"+tr+"\n"));
  });
  Array.prototype.forEach.call(d.querySelectorAll("p,li,tr"),function(el){el.appendChild(document.createTextNode("\n"))});
  Array.prototype.forEach.call(d.querySelectorAll("td,th"),function(el){el.appendChild(document.createTextNode("\t"))});
  return d.textContent.replace(/\t\n/g,"\n").replace(/\n{3,}/g,"\n\n").replace(/[ \t]+$/gm,"").trim();
}

document.getElementById("indietro-top").addEventListener("click",function(){
  var lista=attivi();
  if(document.getElementById("wrap").className.indexOf("largo")>=0) idx=lista.length-1; else idx=Math.max(0,idx-1);
  disegnaPasso();
});
if(location.hash==="#collaudo"){ window.__collaudo={S:S,cancelli:cancelli,verdetto:verdetto,conto:conto,corsa:corsa,report:costruisciReport,testo:reportTesto,vai:function(){disegnaPasso()},esito:function(){disegnaEsito()}}; }
disegnaPasso();
})();
