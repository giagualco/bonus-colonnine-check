#!/usr/bin/env python3
"""Estrae l'elenco GSE dei dispositivi di ricarica idonei (delibera ARERA 541/2020) dai due PDF
e scrive ../dispositivi_gse.json. Da rilanciare quando il GSE pubblica una nuova versione.

Uso:  python3 estrai_gse.py [--scarica]   (con --scarica riscarica i PDF nella cartella _build)
"""
import json, re, sys, os, urllib.request
QUI=os.path.dirname(os.path.abspath(__file__))
PAG="https://www.gse.it/servizi-per-te/rinnovabili-per-i-trasporti/agevolazioni-per-la-ricarica-dei-veicoli-elettrici/elenco-dispositivi"
BASE="https://www.gse.it/servizi-per-te_site/rinnovabili-per-i-trasporti_site/agevolazioni-per-la-ricarica-dei-veicoli-elettrici_site/Documents/"
PDF={"gdc":BASE+"P541_Elenco%20dispositivi%20idonei%20alla%20sperimentazione%20GDC.pdf",
     "nogdc":BASE+"P541_Elenco%20dispositivi%20idonei%20alla%20sperimentazione%20NO%20GDC.pdf"}
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36"

def scarica():
    for k,u in PDF.items():
        r=urllib.request.Request(u,headers={"User-Agent":UA})
        open(os.path.join(QUI,k+".pdf"),"wb").write(urllib.request.urlopen(r,timeout=60).read())
        print("scaricato",k)

def norm(x): return re.sub(r"\s+"," ",(x or "").replace("\n"," ")).strip()

def parse(path, gdc):
    import pdfplumber
    rows=[]; problemi=[]; ultimo=None; versione_elenco=None
    with pdfplumber.open(path) as pdf:
        for pi,p in enumerate(pdf.pages):
            txt=p.extract_text() or ""
            m=re.search(r"\b([A-Z][a-z]+ 20\d\d)\b",txt)
            if m and not versione_elenco: versione_elenco=m.group(1)
            ts=p.find_tables()
            if not ts: continue
            top_first=min(t.bbox[1] for t in ts)
            ws=[w for w in p.extract_words() if 90<w["top"]<top_first and w["x0"]<400]
            costruttore=norm(" ".join(w["text"] for w in sorted(ws,key=lambda w:(round(w["top"]),w["x0"])))) or ultimo
            ultimo=costruttore
            sito=riferimenti=None
            for t in ts:
                d=t.extract()
                if d and norm(d[0][0]).upper()=="SITO INTERNET":
                    sito=norm(d[0][1]); riferimenti=norm(d[1][1]) if len(d)>1 else None
            links=[a for a in (p.annots or []) if a.get("uri")]
            links.sort(key=lambda a:a["top"])   # dall'alto verso il basso, stesso ordine delle righe
            uris=[a["uri"] for a in links]
            for t in ts:
                d=t.extract()
                if not d or norm(d[0][0]).upper()!="MODELLO": continue
                modello=None; li=0
                for r in d[1:]:
                    r=[norm(c) for c in r]+[""]*(8-len(r))
                    if r[0]: modello=r[0]
                    if not modello: problemi.append((pi+1,"riga senza modello",r)); continue
                    link=None
                    if r[7].lower().startswith("clicca"):
                        link=uris[li] if li<len(uris) else None; li+=1
                    rows.append({"costruttore":costruttore,"modello":modello,"versione":r[1],
                        "dispositivo_esterno":r[2],"alimentazione":r[3].replace(" E "," e "),"potenza_kw":r[4],
                        "connessione":r[5],"programmazione_oraria":r[6],"link":link,
                        "gdc":gdc,"pagina_pdf":pi+1,"sito_costruttore":sito,"riferimenti":riferimenti})
                if li!=len(uris): problemi.append((pi+1,"link nel pdf %d vs celle 'clicca qui' %d"%(len(uris),li)))
    return rows,problemi,versione_elenco

if __name__=="__main__":
    if "--scarica" in sys.argv: scarica()
    gdc,p1,v1=parse(os.path.join(QUI,"gdc.pdf"),True)
    nog,p2,v2=parse(os.path.join(QUI,"nogdc.pdf"),False)
    tutti=gdc+nog
    cos=sorted(set(r["costruttore"] for r in tutti)); mod=set((r["costruttore"],r["modello"]) for r in tutti)
    import datetime
    out={"_fonte":"GSE — Elenco dispositivi di ricarica idonei ai sensi della delibera ARERA 541/2020/R/eel, due PDF: con e senza Gestione Dinamica del Carico",
      "_versione_elenco":v1 or v2,"_url_pagina":PAG,"_pdf_gdc":PDF["gdc"],"_pdf_no_gdc":PDF["nogdc"],
      "_estratto_il":datetime.date.today().isoformat(),
      "_metodo":"pdfplumber, tabelle per pagina; nome costruttore dalla fascia sopra la prima tabella; link dalle annotazioni PDF in ordine verticale",
      "_avvertenza_gse":"Il GSE scrive in testa a ogni pagina: i dati riportati sono indicativi, prendere visione delle schede tecniche del costruttore",
      "_regola_bando":"DD MIMIT 4/08/2026 art. 4 c.1 lett. d: per l'annualità 2026 il dispositivo deve risultare nell'elenco GSE vigente alla data di presentazione della domanda",
      "_righe":len(tutti),"_costruttori":len(cos),"_modelli_distinti":len(mod),"dispositivi":tutti}
    json.dump(out,open(os.path.join(QUI,"..","dispositivi_gse.json"),"w"),ensure_ascii=False,indent=1)
    print("versione elenco:",out["_versione_elenco"],"| righe",len(tutti),"| costruttori",len(cos),"| modelli",len(mod),"| problemi:",p1,p2)
