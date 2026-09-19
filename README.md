# Bonus colonnine: il mio caso rientra?

Uno strumento gratuito del canale YouTube **Gianluca Gualco — Energia**. Il terzo, dopo il
calcolatore fotovoltaico e quello delle comunità energetiche.

Rispondi a una quindicina di domande e ti dice se hai i requisiti del **Bonus colonnine domestiche
2026** come li scrive il decreto, uno per uno, con l'articolo accanto; ti fa cercare la tua wallbox
nell'**elenco del GSE**; fa il conto dell'80% con il tetto; ti dice perché lo sportello è **una corsa
e non una scadenza**; e ti fa stampare la **checklist dei documenti** — o, se non hai ancora comprato,
le sette cose da farti confermare per iscritto dall'installatore.

**Non chiede la mail. Non registra niente. Non parla mai con la rete. Non ha niente da venderti.**

## Com'è fatto

Un file HTML unico, senza dipendenze, che funziona anche offline: `index.html`. Il font è
incorporato. L'elenco GSE è dentro il file. Si stampa e si salva in PDF senza passare da nessun
servizio. È il gemello dei due calcolatori precedenti: stesso CSS, stessa meccanica a passi, stesso
foglio stampabile.

Il file si **assembla** da `_build/`:

| File | Cosa fa |
|---|---|
| `_build/estrai_gse.py` | legge i due PDF del GSE e scrive `dispositivi_gse.json` (`--scarica` per riscaricarli) |
| `_build/app.js` | tutta la logica: domande, cancelli, conto, corsa, ricerca, foglio |
| `_build/stile-extra.css` | il CSS in più rispetto ai calcolatori |
| `_build/costruisci.py` | incolla font e CSS del calcolatore CER, il JSON compattato e `app.js` in `index.html` |

## Cosa controlla

Undici cancelli, ognuno con la fonte: chi chiede · data di completamento · dove sta e chi la usa ·
dispositivo nuovo · installatore con dichiarazione di conformità DM 37/2008 · modello nell'elenco GSE
(solo 2026) · fattura elettronica intestata a chi chiede · pagamento tracciato dal conto di chi
chiede, senza finanziamento · nessun cumulo · domande precedenti · SPID e PEC.

L'esito è **Dentro**, **Dentro con N cose da sistemare**, **Fuori** o **Non in questo sportello**
(installazione nel 2027). Dove si esce, si esce col motivo scritto e con la via d'uscita, se c'è.

## Le fonti

Tutte le costanti stanno in [`parametri.json`](parametri.json) con fonte e data. Le principali:

- **DPCM 10 giugno 2026** (Fondo automotive 2026-2030), art. 6: l'80%, i tetti di 1.500 e 8.000 €
- **DD MIMIT 4 agosto 2026**: soggetti, spese, requisiti del dispositivo, allegati, cumulo, una domanda per soggetto
- **DD MIMIT 11 settembre 2026 (sportello)**: dalle 12:00 del 22/09/2026 alle 12:00 del 31/01/2027, 15 M€, ordine cronologico
- **DD MIMIT 11 settembre 2026 (controlli)**: campione del 10%, dieci giorni per integrare, restituzione entro 60
- **Elenco GSE** dei dispositivi idonei (delibera ARERA 541/2020), versione **Maggio 2026**: 37 costruttori, 97 modelli, 224 versioni
- **Comunicato MIMIT sull'edizione 2024**: 5.319 domande nel primo mese, ticket medio 1.187 € — l'unico dato storico; la stima di tenuta del fondo è un'elaborazione propria e la pagina lo dice

Due cose che la pagina dichiara invece di inventare: i decreti non danno una soglia in kW per la
«potenza standard», e non fissano un quorum per la delibera condominiale. E una che segnala: le FAQ
di Invitalia chiedono una «relazione finale» che **nei decreti 2026 non compare**.

## Manutenzione

- **L'elenco GSE** è la costante che invecchia per prima: alla domanda vale quello vigente quel giorno.
  Quando il GSE ripubblica: `python3 _build/estrai_gse.py --scarica && python3 _build/costruisci.py`.
- **Le domande arrivate** allo sportello: appena MIMIT o Invitalia pubblicano un numero, si aggiorna
  `parametri.json` e il blocco `DOMANDE_ARRIVATE` in `_build/app.js`, poi si riassembla.
- Il contatore della corsa usa l'orologio del dispositivo: prima del 22/09 conta i giorni all'apertura,
  poi i giorni di sportello, dopo il 31/01/2027 dichiara lo sportello chiuso.

## Da dove arrivo io

Il canale è di Gianluca Gualco. Non vendo colonnine, non le installo e non presento domande per conto
terzi: in questa pagina non c'è niente da comprare e nessuno da contattare.

## Licenza

MIT. Il codice è aperto perché uno strumento che ti dice «sei fuori» deve poter essere controllato
riga per riga.
