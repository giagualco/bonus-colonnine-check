#!/usr/bin/env python3
"""Assembla ../index.html (file unico) da:
   - font e CSS del calcolatore CER (gemello per costruzione), presi da YOUTUBE/CALCOLATORE_CER/index.html
   - stile-extra.css
   - ../dispositivi_gse.json  → variabile GSE compatta incorporata nello script
   - app.js
Uso: python3 costruisci.py
"""
import json, os, re, datetime
QUI=os.path.dirname(os.path.abspath(__file__))
RADICE=os.path.abspath(os.path.join(QUI,".."))
CER=os.path.join(RADICE,"..","CALCOLATORE_CER","index.html")

sorgente=open(CER,encoding="utf-8").read()
i_style=sorgente.index("<style>"); i_fine=sorgente.index("</style>")
css_cer=sorgente[i_style+len("<style>"):i_fine]      # @font-face con il font in base64 + tutto il CSS
extra=open(os.path.join(QUI,"stile-extra.css"),encoding="utf-8").read()
app=open(os.path.join(QUI,"app.js"),encoding="utf-8").read()
d=json.load(open(os.path.join(RADICE,"dispositivi_gse.json"),encoding="utf-8"))

# dataset compatto: [costruttore, modello, versione, dispositivo esterno, alimentazione, potenza, connessione, prog. oraria, link, gdc]
righe=[[r["costruttore"],r["modello"],r["versione"],r["dispositivo_esterno"],r["alimentazione"],r["potenza_kw"],
        r["connessione"],r["programmazione_oraria"],r["link"] or "",r["gdc"]] for r in d["dispositivi"]]
dati=("/* Elenco GSE dei dispositivi idonei (delibera ARERA 541/2020), versione %s, estratto il %s dai due PDF ufficiali\n"
      "   con _build/estrai_gse.py. Campi: costruttore, modello, versione, dispositivo esterno, alimentazione, potenza kW,\n"
      "   connessione, programmazione oraria, link scheda, con gestione dinamica del carico. */\n"
      "var GSE_COSTRUTTORI=%d, GSE_MODELLI=%d, GSE_RIGHE=%d;\nvar GSE=%s;\n") % (
      d["_versione_elenco"], d["_estratto_il"], d["_costruttori"], d["_modelli_distinti"], d["_righe"],
      json.dumps(righe,ensure_ascii=False,separators=(",",":")).replace("</","<\\/"))

# la versione dell'elenco dentro app.js segue il JSON
app=re.sub(r'var GSE_VERSIONE="[^"]*";', 'var GSE_VERSIONE="%s";' % d["_versione_elenco"], app)

html=("<!DOCTYPE html>\n<html lang=\"it\">\n<head>\n<meta charset=\"utf-8\">\n"
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n"
      "<meta name=\"description\" content=\"Bonus colonnine domestiche 2026: controlla i requisiti come li chiede il decreto, cerca la tua wallbox nell'elenco GSE, fai il conto e stampa la checklist dei documenti. Gratis, senza mail, senza tracciamento.\">\n"
      "<meta name=\"robots\" content=\"index,follow\">\n"
      "<title>Bonus colonnine: il mio caso rientra?</title>\n"
      "<style>"+css_cer+extra+"</style>\n</head>\n<body>\n"
      "<div class=\"wrap\" id=\"wrap\">\n  <div class=\"testata\">\n    <span class=\"marchio\">Bonus colonnine check</span>\n    <button type=\"button\" class=\"torna\" id=\"indietro-top\" hidden>&larr; Indietro</button>\n"
      "    <span class=\"contatore\" id=\"contatore\"></span>\n  </div>\n  <div class=\"barra\"><i id=\"barra\"></i></div>\n  <div id=\"palco\"></div>\n</div>\n"
      "<div id=\"stampa\"></div>\n\n<script>\n"+dati+"\n"+app+"\n</script>\n</body>\n</html>\n")
out=os.path.join(RADICE,"index.html")
open(out,"w",encoding="utf-8").write(html)
print("scritto",out,len(html.encode('utf-8'))//1024,"KB — elenco GSE",d["_versione_elenco"],"(%d righe)"%d["_righe"])
