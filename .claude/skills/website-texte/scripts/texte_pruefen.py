#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
texte_pruefen.py: Prüfer für deutsche Website-Texte (Skill "website-texte").

Prüft Lesbarkeit, Satzlänge, Floskeln und KI-Klang, Anrede (Sie/du),
Kundenfokus (wir/Sie), Passiv, Nominalstil, Belege und Rechts-Fallen,
Überschriften, Buttons, Links, Bilder, Formularfelder, Title und
Meta-Description sowie deutsche Typografie.

Aufruf
  python3 texte_pruefen.py seite.html
  python3 texte_pruefen.py textplan.md --anrede sie --ort "Gütersloh"
  python3 texte_pruefen.py a.html b.html --json
  echo "Ein Text." | python3 texte_pruefen.py -
  python3 texte_pruefen.py --liste        alle Floskel-Regeln anzeigen
  python3 texte_pruefen.py --selbsttest   prüft, ob das Skript richtig arbeitet

Eingaben
  .html/.htm  sichtbarer Text, Überschriften, Buttons, Links, Bilder,
              Formularfelder, <title>, <meta name="description">
  .md         Textplan mit Feldern ("H1:", "Unterzeile:", "Button:",
              "Title:", "Meta-Description:", "Alt:") oder normales Markdown
  .txt / -    Absätze, durch Leerzeilen getrennt

Stufen
  FEHLER   muss vor der Veröffentlichung weg
  WARNUNG  sollte geändert werden
  HINWEIS  prüfen und bewusst entscheiden
  BELEG    Aussage braucht eine Quelle vom Kunden (Zahl, Preis, Zusage, Titel)

Exit-Code: 0 = keine FEHLER, 1 = FEHLER gefunden, 2 = Bedienfehler.
Nur Python-Standardbibliothek (ab 3.8).
"""

import argparse
import json
import re
import sys
import unicodedata
from html.parser import HTMLParser
from pathlib import Path

STUFEN = ("FEHLER", "WARNUNG", "HINWEIS", "BELEG")

# ---------------------------------------------------------------------------
# Datenmodell
# ---------------------------------------------------------------------------


class Block:
    """Ein Stück Text mit seiner Rolle auf der Seite."""

    __slots__ = ("art", "text", "attrs")

    def __init__(self, art, text, attrs=None):
        # art: title, meta, h1..h6, p, li, text, quote, caption, td, label,
        #      summary, button, link, img, feld
        self.art = art
        self.text = text
        self.attrs = attrs or {}

    def __repr__(self):
        return "Block(%s, %r)" % (self.art, self.text[:40])


UEBERSCHRIFTEN = ("h1", "h2", "h3", "h4", "h5", "h6")
PROSA = {"p", "li", "text", "quote", "caption", "td", "dd", "summary"}
LESBARE = PROSA | set(UEBERSCHRIFTEN) | {"button", "label"}


def norm_ws(text):
    """Leerraum zusammenfassen, Zeilenumbrüche behalten."""
    zeilen = []
    for z in text.split("\n"):
        z = re.sub(r"[ \t\r\f\v   ]+", " ", z).strip()
        # Leerzeichen, die nur durch Tag-Grenzen entstehen, vor Satzzeichen weg
        z = re.sub(r" (?=[,.;:!?)\]“”»](?:\s|$))", "", z)
        zeilen.append(z)
    return "\n".join(z for z in zeilen if z)


# ---------------------------------------------------------------------------
# HTML lesen
# ---------------------------------------------------------------------------

UEBERSPRINGEN = {"script", "style", "noscript", "template", "svg", "code",
                 "pre", "iframe", "object", "canvas", "math", "select"}
LEER_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input",
             "link", "meta", "param", "source", "track", "wbr"}
BLOCK_ART = {
    "p": "p", "li": "li", "h1": "h1", "h2": "h2", "h3": "h3", "h4": "h4",
    "h5": "h5", "h6": "h6", "td": "td", "th": "td", "dt": "p", "dd": "dd",
    "blockquote": "quote", "figcaption": "caption", "caption": "caption",
    "summary": "summary", "legend": "label", "label": "label",
    "button": "button", "textarea": "feldtext",
    "div": "text", "section": "text", "article": "text", "header": "text",
    "footer": "text", "main": "text", "aside": "text", "form": "text",
    "figure": "text", "details": "text", "address": "text",
    "fieldset": "text", "body": "text", "ul": "text", "ol": "text",
    "dl": "text", "table": "text", "tr": "text", "thead": "text",
    "tbody": "text", "tfoot": "text", "nav": "nav", "hgroup": "text",
    "search": "text", "dialog": "text", "menu": "text",
}
SCHLIESST_P = {"p", "div", "ul", "ol", "dl", "table", "section", "article",
               "header", "footer", "main", "aside", "nav", "form", "figure",
               "blockquote", "details", "address", "fieldset", "hr",
               "h1", "h2", "h3", "h4", "h5", "h6", "pre", "menu"}
CTA_KLASSE = re.compile(r"(?:^|[\s_-])(btn|button|cta|knopf|action)(?:$|[\s_-])",
                        re.I)


class HtmlLeser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.bloecke = []
        self.stapel = []          # [tag, puffer(list), attrs]
        self.skip_tag = None
        self.skip_tiefe = 0
        self.versteckt_tag = None
        self.versteckt_tiefe = 0
        self.im_title = False
        self.title = []
        self.meta_description = None
        self.lang = None
        self.links = []           # offene <a>: dict
        self.label_tiefe = 0
        self.label_for = set()
        self.felder = []
        self.nav_tiefe = 0

    # -- Hilfen ------------------------------------------------------------
    def _schliesse_bis(self, tag):
        """Schließt offene Elemente bis einschließlich tag."""
        if not any(e[0] == tag for e in self.stapel):
            return
        while self.stapel:
            e = self.stapel.pop()
            self._ausgeben(e)
            if e[0] == tag:
                break

    def _ausgeben(self, eintrag):
        tag, puffer, attrs = eintrag
        if tag == "nav":
            self.nav_tiefe = max(0, self.nav_tiefe - 1)
            return
        if tag == "label":
            self.label_tiefe = max(0, self.label_tiefe - 1)
        if tag == "a":
            return
        text = norm_ws("".join(puffer))
        if not text:
            return
        art = BLOCK_ART.get(tag, "text")
        if art == "feldtext":
            return
        self.bloecke.append(Block(art, text, attrs))

    def _text_an(self, daten):
        if self.stapel and self.nav_tiefe == 0:
            self.stapel[-1][1].append(daten)
        for link in self.links:
            link["text"].append(daten)

    # -- Parser-Ereignisse ---------------------------------------------------
    def handle_starttag(self, tag, attrs):
        a = {k: (v if v is not None else "") for k, v in attrs}
        if tag == "html" and a.get("lang"):
            self.lang = a["lang"]
        if self.skip_tag:
            if tag == self.skip_tag:
                self.skip_tiefe += 1
            return
        if self.versteckt_tag:
            if tag == self.versteckt_tag and tag not in LEER_TAGS:
                self.versteckt_tiefe += 1
            return
        if tag in UEBERSPRINGEN:
            if tag == "select":
                self._feld(tag, a)
            self.skip_tag, self.skip_tiefe = tag, 1
            return
        if tag == "title":
            self.im_title = True
            return
        if tag == "meta":
            if a.get("name", "").lower() == "description":
                self.meta_description = a.get("content", "")
            return
        versteckt = ("hidden" in a or a.get("aria-hidden") == "true"
                     or re.search(r"display\s*:\s*none", a.get("style", "")))
        if versteckt:
            if tag not in LEER_TAGS:
                self.versteckt_tag, self.versteckt_tiefe = tag, 1
            return
        if tag == "br":
            if self.stapel:
                self.stapel[-1][1].append("\n")
            return
        if tag == "img":
            if a.get("role") in ("presentation", "none"):
                return
            self.bloecke.append(Block("img", a.get("alt") or "", {
                "src": a.get("src", ""), "hat_alt": "alt" in a}))
            return
        if tag == "input":
            typ = a.get("type", "text").lower()
            if typ == "hidden":
                return
            if typ in ("submit", "button", "reset"):
                text = a.get("value") or a.get("aria-label") or ""
                self.bloecke.append(Block("button", text,
                                          {"href": "", "typ": typ}))
                return
            if typ == "image":
                self.bloecke.append(Block("img", a.get("alt") or "", {
                    "src": a.get("src", ""), "hat_alt": "alt" in a}))
                return
            self._feld(tag, a)
            return
        if tag == "textarea":
            self._feld(tag, a)
        # Absätze und Listenpunkte schließen sich selbst
        if tag in SCHLIESST_P and self.stapel and self.stapel[-1][0] == "p":
            self._schliesse_bis("p")
        if tag == "li":
            for e in reversed(self.stapel):
                if e[0] in ("ul", "ol", "menu"):
                    break
                if e[0] == "li":
                    self._schliesse_bis("li")
                    break
        if tag in ("td", "th"):
            for e in reversed(self.stapel):
                if e[0] == "tr":
                    break
                if e[0] in ("td", "th"):
                    self._schliesse_bis(e[0])
                    break
        if tag in ("dt", "dd"):
            for e in reversed(self.stapel):
                if e[0] == "dl":
                    break
                if e[0] in ("dt", "dd"):
                    self._schliesse_bis(e[0])
                    break
        if tag == "a":
            klasse = a.get("class", "")
            cta = bool(CTA_KLASSE.search(klasse)) or a.get("role") == "button"
            self.links.append({"href": a.get("href", ""), "text": [],
                               "cta": cta, "aria": a.get("aria-label", "")
                               or a.get("title", ""),
                               "nav": self.nav_tiefe > 0})
            if cta:
                self.stapel.append(["a", [], a])
            return
        if tag == "nav":
            self.nav_tiefe += 1
        if tag == "label":
            self.label_tiefe += 1
            if a.get("for"):
                self.label_for.add(a["for"])
        if tag in BLOCK_ART:
            self.stapel.append([tag, [], a])
        elif tag not in LEER_TAGS:
            # Inline-Element (span, strong …): Grenze als Leerzeichen, damit
            # "<span>Einrichtung</span><span>ab 249 €</span>" nicht verklebt
            self._text_an(" ")

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in LEER_TAGS and not self.skip_tag:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if self.skip_tag:
            if tag == self.skip_tag:
                self.skip_tiefe -= 1
                if self.skip_tiefe <= 0:
                    self.skip_tag = None
            return
        if self.versteckt_tag:
            if tag == self.versteckt_tag:
                self.versteckt_tiefe -= 1
                if self.versteckt_tiefe <= 0:
                    self.versteckt_tag = None
            return
        if tag == "title":
            self.im_title = False
            return
        if tag == "a":
            if self.links:
                link = self.links.pop()
                text = norm_ws("".join(link["text"])).replace("\n", " ")
                art = "button" if link["cta"] else "link"
                self.bloecke.append(Block(art, text, {
                    "href": link["href"], "aria": link["aria"],
                    "nav": link["nav"]}))
                if link["cta"] and self.stapel and self.stapel[-1][0] == "a":
                    self.stapel.pop()
            return
        if tag in BLOCK_ART:
            self._schliesse_bis(tag)
        elif tag not in LEER_TAGS:
            self._text_an(" ")

    def handle_data(self, daten):
        if self.skip_tag or self.versteckt_tag:
            return
        if self.im_title:
            self.title.append(daten)
            return
        self._text_an(daten)

    def _feld(self, tag, a):
        typ = a.get("type", tag).lower()
        self.felder.append({
            "tag": tag, "typ": typ, "id": a.get("id", ""),
            "name": a.get("name", ""), "placeholder": a.get("placeholder", ""),
            "aria": a.get("aria-label", "") or a.get("aria-labelledby", "")
            or a.get("title", ""),
            "im_label": self.label_tiefe > 0,
            "pflicht": "required" in a or a.get("aria-required") == "true"})

    def ergebnis(self):
        while self.stapel:
            self._ausgeben(self.stapel.pop())
        bloecke = []
        title = norm_ws("".join(self.title)).replace("\n", " ")
        if title:
            bloecke.append(Block("title", title))
        if self.meta_description is not None:
            bloecke.append(Block("meta", norm_ws(self.meta_description)
                                 .replace("\n", " ")))
        bloecke.extend(self.bloecke)
        for f in self.felder:
            f["beschriftet"] = bool(f["im_label"] or f["aria"]
                                    or (f["id"] and f["id"] in self.label_for))
            bloecke.append(Block("feld", f.get("placeholder", ""), f))
        return bloecke, {"lang": self.lang, "html": True,
                         "hat_title": bool(title),
                         "hat_meta": self.meta_description is not None}


def lies_html(quelltext):
    leser = HtmlLeser()
    leser.feed(quelltext)
    leser.close()
    return leser.ergebnis()


# ---------------------------------------------------------------------------
# Markdown und Textplan lesen
# ---------------------------------------------------------------------------

LABEL_RE = re.compile(
    r"^\s*(?:[-*+]\s+)?(?:\*\*|__)?(?P<label>[A-Za-zÄÖÜäöüß][\wÄÖÜäöüß .\-/()]{0,34}?)"
    r"(?:\*\*|__)?\s*:(?:\*\*|__)?\s*(?P<wert>.*)$")
TEXTPLAN_ARTEN = [
    (r"^h([1-6])$", None),
    (r"^(title|meta-?title|seitentitel|seo-?titel|titel-?tag)$", "title"),
    (r"^(meta-?description|description|meta-?beschreibung|seo-?beschreibung)$",
     "meta"),
    (r"^(button|cta|knopf|call to action|aktion)\b.*$", "button"),
    (r"^(link|linktext)\b.*$", "link"),
    (r"^(alt|alt-?text|alt text|bild-?alt)\b.*$", "img"),
    (r"^(label|feld|formularfeld|feldname)\b.*$", "label"),
    (r"^(zitat|kundenstimme|stimme|testimonial)\b.*$", "quote"),
    (r"^(frage|faq-frage)\b.*$", "summary"),
    (r"^(punkt|liste|listenpunkt|vorteil|nutzen|schritt)\b.*$", "li"),
]
TEXTPLAN_COPY = re.compile(
    r"^(h[1-6]|title|meta-?title|meta-?description|button.*|cta.*|"
    r"unterzeile|lead|text|absatz|alt.*)$", re.I)
TEXTPLAN_SKIP_LABEL = re.compile(
    r"^(bild|foto|video|grafik|notiz|hinweis für|anmerkung|quelle|beleg|status|"
    r"ziel|zweck|aufgabe|idee|warum|begründung|abschnitt|seite|stand|anrede|"
    r"zielgruppe|ziel-?aktion|datei|url|slug|keyword|keywords|suchbegriff|"
    r"suchbegriffe|ort|branche|betrieb|kunde|datum|harte tatsache|"
    r"tatsache|fakt|aussage|änderung|vorher|alt-?zustand|positionierung|"
    r"für wen|kategorie|hauptnutzen|ton|länge|höhe|layout|reihenfolge)\b",
    re.I)
TEXTPLAN_SKIP_ABSCHNITT = re.compile(
    r"(offene fragen|fragen an|beleg|botschaft|nachrichtenkarte|prüf|notiz|"
    r"änderung|faktenliste|quellen|briefing|bericht|kennzahlen|vorher|"
    r"anmerkung|aufgaben|todo|to-do|zusammenfassung|abgabe|so benutzen)", re.I)

MD_LINK = re.compile(r"(?<!!)\[([^\]]*)\]\(([^)\s]*)[^)]*\)")
MD_BILD = re.compile(r"!\[([^\]]*)\]\(([^)\s]*)[^)]*\)")


def md_inline(text, bloecke):
    for alt, src in MD_BILD.findall(text):
        bloecke.append(Block("img", alt, {"src": src, "hat_alt": True}))
    text = MD_BILD.sub("", text)
    for linktext, href in MD_LINK.findall(text):
        bloecke.append(Block("link", linktext.strip(), {"href": href}))
    text = MD_LINK.sub(lambda m: m.group(1), text)
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"(\*\*|__)(.+?)\1", r"\2", text)
    text = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?!\w)", r"\1", text)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


def ist_textplan(zeilen):
    n = 0
    for z in zeilen:
        m = LABEL_RE.match(z)
        if m and TEXTPLAN_COPY.match(m.group("label").strip().lower()):
            n += 1
    return n >= 3


def label_art(label):
    l = re.sub(r"\s+", " ", label.strip().lower())
    l_kurz = re.sub(r"\s*\(?\s*\d+\s*[.)]?\s*$", "", l) if not re.match(
        r"^h[1-6]$", l) else l
    for muster, art in TEXTPLAN_ARTEN:
        m = re.match(muster, l_kurz)
        if m:
            return art if art else "h" + m.group(1)
    if TEXTPLAN_SKIP_LABEL.match(l_kurz):
        return None
    return "p"


def lies_markdown(quelltext):
    bloecke = []
    zeilen = quelltext.replace("\r\n", "\n").split("\n")
    # Front Matter und HTML-Kommentare entfernen
    if zeilen and zeilen[0].strip() == "---":
        for i in range(1, len(zeilen)):
            if zeilen[i].strip() == "---":
                zeilen = zeilen[i + 1:]
                break
    text = re.sub(r"<!--.*?-->", "", "\n".join(zeilen), flags=re.S)
    zeilen = text.split("\n")
    plan = ist_textplan(zeilen)
    info = {"lang": None, "html": False, "textplan": plan,
            "hat_title": False, "hat_meta": False,
            "offen": len(re.findall(r"\[(?:FEHLT|OFFEN|PRÜFEN)\b", text, re.I))}

    absatz = []
    absatz_art = ["p"]
    im_code = False
    skip_ebene = None   # Ebene der übersprungenen Überschrift
    letzter_plan = [None]

    def absatz_ende():
        if absatz:
            t = md_inline(" ".join(absatz), bloecke)
            if t:
                bloecke.append(Block(absatz_art[0], t))
            absatz.clear()
        absatz_art[0] = "p"

    for zeile in zeilen:
        roh = zeile.rstrip()
        if roh.strip().startswith("```") or roh.strip().startswith("~~~"):
            absatz_ende()
            im_code = not im_code
            continue
        if im_code:
            continue
        m_h = re.match(r"^(#{1,6})\s+(.*?)\s*#*\s*$", roh)
        if m_h:
            absatz_ende()
            ebene = len(m_h.group(1))
            titel = m_h.group(2)
            if skip_ebene is not None and ebene <= skip_ebene:
                skip_ebene = None
            if plan:
                if TEXTPLAN_SKIP_ABSCHNITT.search(titel):
                    skip_ebene = ebene
                # im Textplan sind #-Überschriften Gliederung, keine Seitentexte
                continue
            if skip_ebene is None:
                t = md_inline(titel, bloecke)
                if t:
                    bloecke.append(Block("h%d" % ebene, t))
            continue
        if skip_ebene is not None:
            continue
        if not roh.strip():
            absatz_ende()
            letzter_plan[0] = None
            continue
        if re.match(r"^\s*(\|.*\|)\s*$", roh):
            absatz_ende()
            if plan:
                continue
            zellen = [c.strip() for c in roh.strip().strip("|").split("|")]
            if all(re.match(r"^:?-{2,}:?$", c) for c in zellen if c):
                continue
            for c in zellen:
                t = md_inline(c, bloecke)
                if t:
                    bloecke.append(Block("td", t))
            continue
        if re.match(r"^\s*([-*_])\s*\1\s*\1[\s\1]*$", roh):
            absatz_ende()
            continue
        if plan:
            m = LABEL_RE.match(roh)
            if m:
                absatz_ende()
                art = label_art(m.group("label"))
                wert = m.group("wert").strip()
                letzter_plan[0] = art
                if art and wert:
                    if art == "title":
                        info["hat_title"] = True
                    if art == "meta":
                        info["hat_meta"] = True
                    t = md_inline(wert, bloecke) if art not in ("img",) else wert
                    if t:
                        attrs = {"hat_alt": True, "src": ""} if art == "img" else {}
                        bloecke.append(Block(art, t, attrs))
                continue
            # Listenpunkt: immer ein eigener Block
            if re.match(r"^\s*([-*+]|\d+[.)])\s+", roh):
                absatz_ende()
                t = md_inline(re.sub(r"^\s*([-*+]|\d+[.)])\s+", "", roh),
                              bloecke)
                if t:
                    bloecke.append(Block("li", t))
                continue
            if letzter_plan[0] in (None, "p", "li", "quote") or absatz:
                absatz.append(roh.strip())
            continue
        m_li = re.match(r"^\s*([-*+]|\d+[.)])\s+(.*)$", roh)
        if m_li:
            absatz_ende()
            t = md_inline(m_li.group(2), bloecke)
            if t:
                bloecke.append(Block("li", t))
            continue
        m_q = re.match(r"^\s*>\s?(.*)$", roh)
        if m_q:
            if absatz_art[0] != "quote":
                absatz_ende()
                absatz_art[0] = "quote"
            absatz.append(m_q.group(1))
            continue
        absatz.append(roh.strip())
    absatz_ende()
    return bloecke, info


def lies_text(quelltext):
    bloecke = []
    for teil in re.split(r"\n\s*\n", quelltext.replace("\r\n", "\n")):
        t = norm_ws(teil)
        if t:
            bloecke.append(Block("p", t))
    return bloecke, {"lang": None, "html": False, "textplan": False,
                     "hat_title": False, "hat_meta": False}


def lies_datei(pfad, inhalt):
    endung = Path(pfad).suffix.lower() if pfad != "-" else ""
    if endung in (".html", ".htm", ".xhtml", ".php", ".vue", ".svelte",
                  ".astro", ".jsx", ".tsx"):
        return lies_html(inhalt)
    if endung in (".md", ".markdown", ".mdx"):
        return lies_markdown(inhalt)
    if pfad == "-" and re.search(r"<(html|body|h1|p|div)\b", inhalt, re.I):
        return lies_html(inhalt)
    if pfad == "-" and re.search(r"^\s*(#{1,6}\s|H1\s*:)", inhalt, re.M):
        return lies_markdown(inhalt)
    return lies_text(inhalt)


# ---------------------------------------------------------------------------
# Sprache: Sätze, Wörter, Silben
# ---------------------------------------------------------------------------

ABKUERZUNGEN = {
    "z", "b", "d", "h", "u", "a", "o", "s", "e", "v", "f", "ff", "i", "w",
    "ca", "bzw", "evtl", "ggf", "inkl", "zzgl", "exkl", "nr", "tel", "str",
    "dr", "prof", "etc", "usw", "vgl", "max", "min", "mind", "std", "mo",
    "di", "mi", "do", "fr", "sa", "so", "jan", "feb", "mär", "apr", "jun",
    "jul", "aug", "sep", "sept", "okt", "nov", "dez", "st", "abs", "art",
    "hr", "fa", "mio", "mrd", "mwst", "ust", "gem", "geb", "allg", "bspw",
    "bzgl", "insb", "sog", "co", "kg", "lt", "zt", "ugs", "jh", "tsd",
    "durchschn", "zus", "zzt", "vs", "inc", "ltd", "dipl", "ing", "kfm",
    "techn", "staatl", "gepr", "ggü", "sek", "nachm", "vorm", "abt", "erg",
}
SATZENDE = re.compile(r"[.!?…]+[\"'“”»«)\]]*(?=\s|$)")
WORT_RE = re.compile(
    r"[A-Za-zÄÖÜäöüßÀ-ÖØ-öø-ÿ0-9]+(?:[-'’][A-Za-zÄÖÜäöüßÀ-ÖØ-öø-ÿ0-9]+)*")
BUCHSTABEN_WORT = re.compile(r"^[A-Za-zÄÖÜäöüßÀ-ÖØ-öø-ÿ'’-]+$")


def saetze(text):
    """Teilt deutschen Text in Sätze (mit Rücksicht auf Abkürzungen)."""
    ergebnis = []
    for zeile in text.split("\n"):
        start = 0
        for m in SATZENDE.finditer(zeile):
            ende = m.end()
            vor = zeile[start:m.start()]
            nach = zeile[ende:].lstrip()
            if m.group().startswith("."):
                wort = re.findall(r"([\wÄÖÜäöüß]+)$", vor)
                w = wort[0] if wort else ""
                if w.lower() in ABKUERZUNGEN:
                    continue
                if w.isdigit() and len(w) <= 2:
                    continue          # Ordnungszahl oder Datum: "17. November"
                if len(w) == 1 and w.isalpha():
                    continue          # Initiale: "A. Müller"
            if nach and not (nach[0].isupper() or nach[0].isdigit()
                             or nach[0] in "\"„‚»«(["):
                continue
            satz = zeile[start:ende].strip()
            if satz:
                ergebnis.append(satz)
            start = ende
        rest = zeile[start:].strip()
        if rest:
            ergebnis.append(rest)
    return ergebnis


def woerter(text):
    return WORT_RE.findall(text)


VOKALE = re.compile(r"[aeiouyäöüàâáéèêëíìîïóòôúùû]+")
DIPHTHONGE = {"ei", "ie", "au", "eu", "äu", "ai", "ay", "ey", "oi", "ee",
              "aa", "oo", "ou", "ui"}


def silben(wort):
    """Schätzt die Silbenzahl eines deutschen Wortes."""
    w = wort.lower().replace("qu", "qw")
    gesamt = 0
    for teil in re.split(r"[-'’]", w):
        if not teil:
            continue
        n = 0
        for g in VOKALE.findall(teil):
            if len(g) == 1:
                n += 1
            elif len(g) == 2:
                n += 1 if g in DIPHTHONGE else 2
            else:
                n += 2
        gesamt += max(1, n)
    return max(1, gesamt)


def lesbarkeit(texte):
    """Flesch-Amstad und 1. Wiener Sachtextformel über eine Liste von Texten."""
    alle_saetze = []
    for t in texte:
        alle_saetze.extend(s for s in saetze(t) if len(woerter(s)) >= 1)
    wortliste = []
    satzlaengen = []
    for s in alle_saetze:
        w = woerter(s)
        satzlaengen.append(len(w))
        wortliste.extend(x for x in w if BUCHSTABEN_WORT.match(x))
    if len(wortliste) < 20 or not satzlaengen:
        return None
    sil = [silben(w) for w in wortliste]
    asl = sum(satzlaengen) / len(satzlaengen)
    asw = sum(sil) / len(sil)
    amstad = max(0.0, min(100.0, 180 - asl - 58.5 * asw))
    ms = 100.0 * sum(1 for s in sil if s >= 3) / len(sil)
    iw = 100.0 * sum(1 for w in wortliste if len(w) > 6) / len(wortliste)
    es = 100.0 * sum(1 for s in sil if s == 1) / len(sil)
    wstf = 0.1935 * ms + 0.1672 * asl + 0.1297 * iw - 0.0327 * es - 0.875
    return {"amstad": round(amstad), "wstf": round(wstf, 1),
            "asl": round(asl, 1), "saetze": len(satzlaengen),
            "woerter": sum(satzlaengen), "laengster": max(satzlaengen)}


def amstad_stufe(wert):
    if wert >= 80:
        return "leicht"
    if wert >= 70:
        return "eher leicht"
    if wert >= 60:
        return "mittel"
    if wert >= 50:
        return "eher schwer"
    if wert >= 30:
        return "schwer"
    return "sehr schwer"


# ---------------------------------------------------------------------------
# Regeln: Floskeln, KI-Klang, Füllwörter, Nominalstil, Fachjargon
# ---------------------------------------------------------------------------
# (Muster, Stufe, Kategorie, Tipp). Groß-/Kleinschreibung egal.

FLOSKELN = [
    # --- KI-Klang -----------------------------------------------------------
    (r"\bin der heutigen (?:schnelllebigen |digitalen |modernen |hektischen )?"
     r"(?:Zeit|Welt|Geschäftswelt|Arbeitswelt)\b", "WARNUNG", "KI-Klang",
     "Zeitgeist-Einstieg. Direkt mit dem Problem oder dem Angebot beginnen."),
    (r"\bim (?:heutigen )?digitalen Zeitalter\b", "WARNUNG", "KI-Klang",
     "Zeitgeist-Einstieg. Streichen."),
    (r"\btauch(?:en|t|e)? (?:Sie |du |ihr )?(?:tief |gleich |jetzt )?ein\b|"
     r"\beintauchen\b", "WARNUNG", "KI-Klang",
     "Floskel. Sagen, was der Besucher konkret sieht, bekommt oder tut."),
    (r"\bnahtlos\w*", "WARNUNG", "KI-Klang",
     "KI-Wort. Konkret sagen, was zusammenarbeitet, z. B. 'trägt Termine "
     "direkt in Ihren Kalender ein'."),
    (r"\bmaßgeschneidert\w*", "WARNUNG", "KI-Klang",
     "KI-Wort. Sagen, was genau angepasst wird."),
    (r"\bganzheitlich\w*", "WARNUNG", "KI-Klang",
     "Leer. Aufzählen, was dazugehört."),
    (r"\bfacettenreich\w*|\bvielschichtig\w*", "WARNUNG", "KI-Klang",
     "KI-Wort. Konkret werden."),
    (r"\bessen[zt]iell\w*|\bunerlässlich\w*", "HINWEIS", "KI-Klang",
     "Belehrend. Lieber den Grund nennen."),
    (r"\bzukunfts(?:orientiert|sicher|fähig|weisend)\w*", "WARNUNG", "KI-Klang",
     "Leeres Versprechen. Was genau bleibt gültig, und warum?"),
    (r"\brevolution(?:ier\w*|är\w*)", "WARNUNG", "KI-Klang", "Übertreibung."),
    (r"\bauf (?:das|ein) (?:nächste|neues|höheres) (?:Level|Niveau)\b|"
     r"\bnext[- ]level\b", "WARNUNG", "KI-Klang", "Floskel. Ergebnis nennen."),
    (r"\bgame[- ]?changer\w*", "WARNUNG", "KI-Klang", "Floskel."),
    (r"\bentfessel\w*", "WARNUNG", "KI-Klang",
     "Übersetzt aus 'unleash'. Streichen."),
    (r"\btransformier\w*|\bTransformation\w*", "HINWEIS", "KI-Klang",
     "Abstrakt. Was ändert sich konkret für den Kunden?"),
    (r"\bvon (?:entscheidender|zentraler|großer|essen[zt]ieller|"
     r"immenser) Bedeutung\b", "WARNUNG", "KI-Klang",
     "Bedeutungs-Floskel. Den Grund nennen."),
    (r"\bintegrale[nrs]? Bestandteil\w*", "WARNUNG", "KI-Klang", "Floskel."),
    (r"\bspiel(?:t|en) eine (?:entscheidende|zentrale|wichtige|wesentliche|"
     r"große|tragende|bedeutende) Rolle\b", "WARNUNG", "KI-Klang",
     "Floskel. Sagen, was es bewirkt."),
    (r"\bnicht nur\b[^.!?]{1,80}?\bsondern auch\b", "HINWEIS", "KI-Klang",
     "KI-typische Konstruktion. Meist reicht ein einfacher Satz."),
    (r"\bes ist (?:wichtig|entscheidend|ratsam|erwähnenswert),? "
     r"(?:zu )?(?:beachten|betonen|erwähnen|wissen)\b", "WARNUNG", "KI-Klang",
     "Belehrender Einschub. Direkt sagen."),
    (r"\b(?:zusammenfassend|abschließend|insgesamt) (?:lässt sich|kann man|"
     r"kann gesagt werden|ist festzuhalten|sagen)\w*", "WARNUNG", "KI-Klang",
     "Aufsatz-Schluss. Auf Websites streichen."),
    (r"\bvor diesem Hintergrund\b|\bangesichts dieser\b|\bin diesem "
     r"Zusammenhang\b", "HINWEIS", "KI-Klang", "Aufsatz-Deutsch. Streichen."),
    (r"\b(?:begeben|machen|nehmen)\b[^.!?]{0,25}\bauf eine (?:spannende |"
     r"aufregende |gemeinsame )?Reise\b|\bauf eine (?:spannende |aufregende )"
     r"?Reise (?:mit|durch|in)\b", "WARNUNG", "KI-Klang",
     "KI-Metapher. Konkret sagen, was passiert."),
    (r"\b(?:in die|in der|die|eine) Welt (?:der|des|von)\b", "HINWEIS",
     "KI-Klang", "'Welt der …'-Floskel. Das Angebot direkt nennen."),
    (r"\begal ob\b", "HINWEIS", "KI-Klang",
     "Häufiges KI-Muster ('Egal ob X oder Y, wir …'). Zielgruppe direkt "
     "nennen."),
    (r"\bstellen Sie sich vor\b|\bstell dir vor\b", "HINWEIS", "KI-Klang",
     "Nur mit echter, konkreter Szene aus Kundensicht."),
    (r"\bSynergie\w*", "WARNUNG", "KI-Klang", "Leer. Streichen."),
    (r"\bMehrwert\w*", "HINWEIS", "KI-Klang", "Welcher Wert genau?"),
    (r"\b(?:innovative|individuelle|maßgeschneiderte|ganzheitliche|smarte|"
     r"intelligente|digitale|moderne|kreative|effiziente|passgenaue|optimale|"
     r"professionelle|perfekte|flexible|nachhaltige)n? Lösung(?:en)?\b",
     "WARNUNG", "KI-Klang",
     "'Lösungen' sagt nichts. Sagen, was Sie machen und für wen."),
    (r"\binnovativ\w*", "HINWEIS", "KI-Klang",
     "Behauptung. Was ist neu, und was hat der Kunde davon?"),
    (r"\bstate of the art\b|\bcutting[- ]edge\b|\bbest[- ]practice\w*",
     "WARNUNG", "KI-Klang", "Fachfloskel. Konkret werden."),
    (r"\bunterstreich(?:t|en)\b", "HINWEIS", "KI-Klang",
     "KI-Wort ('unterstreicht die Bedeutung'). Direkt sagen."),
    (r"\bBrücke zwischen\b|\bschlägt eine Brücke\b", "HINWEIS", "KI-Klang",
     "Metapher. Konkret werden."),
    (r"\bim Herzen (?:von|der|des)\b", "HINWEIS", "KI-Klang",
     "Orts-Floskel. Straße oder Stadtteil nennen."),
    (r"\bdas A und O\b|\bdas Herzstück\b", "HINWEIS", "KI-Klang", "Floskel."),
    (r"\blassen Sie uns\b|\blass uns\b", "HINWEIS", "KI-Klang",
     "Übersetzt aus 'Let's'. Direkt sagen, was passiert."),
    (r"\bWas bedeutet das für (?:Sie|dich)\b", "HINWEIS", "KI-Klang",
     "Füll-Frage. Gleich die Antwort schreiben."),
    (r"\bLeuchtturm\w*|\bMeilenstein\w*", "HINWEIS", "KI-Klang",
     "Metapher. Konkret werden."),
    (r"\bmühelos\w*|\bspielend (?:leicht|einfach)\b|\bim Handumdrehen\b",
     "HINWEIS", "KI-Klang",
     "Versprechen ohne Beleg. Zeigen, wie viele Schritte es wirklich sind."),
    # --- Werbefloskeln ----------------------------------------------------------
    (r"\bherzlich willkommen\b|\bwillkommen auf (?:unserer|der|meiner) "
     r"(?:Website|Webseite|Homepage|Internetseite|Seite)\b", "WARNUNG",
     "Werbefloskel",
     "Begrüßung verschwendet die wichtigste Stelle. Sagen, was Sie anbieten."),
    (r"\b(?:Ihr|Ihre|dein|deine|der|die|Ihren|deinen) (?:zuverlässige|"
     r"kompetente|starke|verlässliche|erfahrene|professionelle|regionale|"
     r"kreative|innovative)[nr]? (?:Partner|Ansprechpartner|Partnerin|"
     r"Dienstleister|Experte|Experten|Spezialist|Spezialisten|Anbieter)\b",
     "WARNUNG", "Werbefloskel",
     "Partner-Floskel. Sagen, was Sie tun, und es belegen."),
    (r"\bQualität,? die überzeugt\b|\bhöchste[rn]? Qualität\b|"
     r"\bQualität zu fairen Preisen\b|\bbeste[rn]? Qualität\b|"
     r"\bQualität steht\b", "WARNUNG", "Werbefloskel",
     "Leeres Qualitätsversprechen. Woran erkennt man die Qualität?"),
    (r"\b(?:Ihre|deine|die) (?:Kunden)?zufriedenheit (?:ist|steht)\b|"
     r"\bKundenzufriedenheit (?:ist|steht)\b|\bder Kunde steht (?:bei uns )?"
     r"im Mittelpunkt\b|\b(?:Sie|du) stehs?t (?:bei uns )?im Mittelpunkt\b",
     "WARNUNG", "Werbefloskel",
     "Sagen alle. Zeigen, was Sie dafür konkret tun."),
    (r"\bzögern Sie nicht\b|\bzögere nicht\b", "WARNUNG", "Werbefloskel",
     "Floskel vor dem Kontakt. Besser: Button mit klarer Aktion."),
    (r"\blassen Sie sich (?:überzeugen|begeistern|inspirieren|verzaubern|"
     r"verwöhnen)\b|\blass dich (?:überzeugen|begeistern|inspirieren)\b",
     "WARNUNG", "Werbefloskel", "Floskel. Beleg statt Aufforderung."),
    (r"\bmit (?:viel |großer )?(?:Leidenschaft|Herzblut|Liebe zum Detail)\b",
     "WARNUNG", "Werbefloskel",
     "Sagen alle. Zeigen, woran der Kunde es merkt."),
    (r"\b(?:junge[sn]? (?:und )?)?dynamische[sn]? Team\b", "WARNUNG",
     "Werbefloskel", "Floskel. Menschen mit Namen und Aufgaben zeigen."),
    (r"\brundum[- ]?sorglos\w*", "HINWEIS", "Werbefloskel",
     "Was ist genau enthalten? Aufzählen."),
    (r"\balles aus einer Hand\b", "HINWEIS", "Werbefloskel",
     "Nur mit Aufzählung, was genau dazugehört."),
    (r"\bwir freuen uns (?:auf|über) (?:Ihre|deine|Ihren|deinen|eine) "
     r"(?:Anfrage|Nachricht|Besuch|Anruf|Kontaktaufnahme)\b", "HINWEIS",
     "Werbefloskel",
     "Höflich, aber leer. Sagen, was nach der Anfrage passiert."),
    (r"\bwir bieten (?:Ihnen|dir|euch)\b|\bunser Angebot umfasst\b|"
     r"\bunser Leistungsspektrum\b|\bunser Portfolio\b", "HINWEIS",
     "Werbefloskel",
     "Wir-Sicht. Aus Kundensicht schreiben ('Sie bekommen …')."),
    (r"\bkundenorientiert\w*|\bkundennah\w*|\bkundenfreundlich\w*", "HINWEIS",
     "Werbefloskel", "Selbstverständlich. Zeigen statt sagen."),
    (r"\bfull[- ]?service\b", "HINWEIS", "Werbefloskel",
     "Was ist genau enthalten?"),
    (r"\btop[- ]?(?:qualität|service|preise?|beratung)\b", "WARNUNG",
     "Werbefloskel", "Werbesprech. Konkret werden."),
    (r"\bpreis[- ]leistungs[- ]verhältnis\b", "HINWEIS", "Werbefloskel",
     "Nur mit konkretem Preis und Leistung."),
    (r"\bauf Augenhöhe\b", "HINWEIS", "Werbefloskel",
     "Floskel. Zeigen, wie die Zusammenarbeit konkret läuft."),
    (r"\bzeitnah\w*", "HINWEIS", "Werbefloskel",
     "Vage. Konkrete Frist nennen, wenn der Kunde sie zusagt."),
    (r"\b(?:schnell|einfach),? (?:und |sowie )?(?:unkompliziert|einfach|"
     r"schnell|bequem)\b|\bunkompliziert\w*", "HINWEIS", "Werbefloskel",
     "Behauptung. Zeigen, wie es abläuft (z. B. 'drei Schritte')."),
    (r"\bIhre Wünsche (?:sind|werden)\b|\bkein Wunsch bleibt\b", "WARNUNG",
     "Werbefloskel", "Floskel und kaum haltbar."),
    # --- Leere Eigenschaften (Beleg statt Adjektiv) ------------------------------
    (r"\bprofessionell\w*", "HINWEIS", "Leere Eigenschaft",
     "Woran erkennt der Kunde das? Beleg oder Beispiel statt Adjektiv."),
    (r"\bkompeten(?:t|te|ten|ter|tes|tem|z)\b", "HINWEIS", "Leere Eigenschaft",
     "Woran erkennt der Kunde das? Qualifikation oder Beispiel nennen."),
    (r"\bzuverlässig\w*|\bverlässlich\w*", "HINWEIS", "Leere Eigenschaft",
     "Zeigen statt sagen, z. B. 'Wir kommen zum vereinbarten Termin'."),
    (r"\bflexib(?:el|le|len|ler|les|lem|ilität)\b", "HINWEIS",
     "Leere Eigenschaft", "Wobei genau? Beispiel nennen."),
    (r"\bhochwertig\w*", "HINWEIS", "Leere Eigenschaft",
     "Woran erkennt man das? Material, Marke, Verfahren nennen."),
    (r"\bindividuell\w*", "HINWEIS", "Leere Eigenschaft",
     "Was genau wird angepasst?"),
    (r"\bperfekt\w*", "HINWEIS", "Leere Eigenschaft", "Übertreibung."),
    (r"\boptimal\w*|\boptimier\w*", "HINWEIS", "Leere Eigenschaft",
     "Abstrakt. Was wird besser, und wie sehr?"),
    (r"\bumfassend\w*", "HINWEIS", "Leere Eigenschaft",
     "Was gehört dazu? Aufzählen."),
    (r"\beffizien(?:t|te|ten|ter|tes|tem|z)\b", "HINWEIS", "Leere Eigenschaft",
     "Abstrakt. Welche Zeit oder welches Geld spart der Kunde?"),
    (r"\bvielfältig\w*", "HINWEIS", "Leere Eigenschaft",
     "Aufzählen statt behaupten."),
    (r"\bmodernst\w*|\bneueste[nr]? (?:Technik|Technologie)\b", "HINWEIS",
     "Leere Eigenschaft", "Beleg? Welche Technik genau?"),
    (r"\berstklassig\w*|\bexzellent\w*|\bherausragend\w*|\bhervorragend\w*|"
     r"\bexklusiv\w*|\bpremium\b", "HINWEIS", "Leere Eigenschaft",
     "Übertreibung ohne Beleg."),
    (r"\bspannend\w*|\bfaszinierend\w*", "HINWEIS", "Leere Eigenschaft",
     "Sagen, was daran interessant ist."),
    (r"\bleistungsstark\w*|\bpowerful\b|\bleistungsfähig\w*", "HINWEIS",
     "Leere Eigenschaft", "Was leistet es konkret?"),
    # --- Füllwörter und Amtsdeutsch ------------------------------------------------
    (r"\beigentlich\b|\bquasi\b|\bsozusagen\b|\bgewissermaßen\b|"
     r"\birgendwie\b|\bdurchaus\b|\bim Grunde(?: genommen)?\b|"
     r"\bim Prinzip\b|\bletztendlich\b|\bletzten Endes\b", "HINWEIS",
     "Füllwort", "Streichen."),
    (r"\bselbstverständlich\b|\bnatürlich\b", "HINWEIS", "Füllwort",
     "Meist streichbar. Gesetzliche Rechte nie als Besonderheit bewerben."),
    (r"\bgrundsätzlich\b", "HINWEIS", "Füllwort",
     "Füllwort oder versteckte Einschränkung? Klar sagen."),
    (r"\bbezüglich\b|\bhinsichtlich\b|\bdiesbezüglich\b|\bseitens\b|"
     r"\bmittels\b|\bzwecks\b|\bbetreffend\b|\bvorliegende[nmrs]?\b|"
     r"\bobige[nmrs]?\b|\bbeiliegende[nmrs]?\b|\bnachfolgende[nmrs]?\b",
     "HINWEIS", "Amtsdeutsch", "Behördensprache. Einfacher sagen."),
    (r"\bim Rahmen (?:von|der|des|einer|eines|unserer|Ihrer)\b", "HINWEIS",
     "Amtsdeutsch", "Behördensprache. 'bei', 'in' oder 'während'."),
    (r"\bdes Weiteren\b|\bferner\b|\bfernerhin\b|\bdarüber hinaus\b|"
     r"\bnichtsdestotrotz\b", "HINWEIS", "Amtsdeutsch",
     "Aufsatz-Übergang. Oft streichbar."),
    (r"\bbeziehungsweise\b|\bbzw\.", "HINWEIS", "Amtsdeutsch",
     "Entscheiden: 'oder' oder 'und'."),
    # --- Nominalstil: Funktionsverbgefüge -----------------------------------------
    (r"\bzur Verfügung (?:zu )?(?:stellen|gestellt|stellt)\b", "HINWEIS",
     "Nominalstil", "Verb nehmen: 'geben', 'bereitstellen'."),
    (r"\bin Anspruch (?:zu )?(?:nehmen|genommen|nimmt)\b|\bInanspruchnahme\b",
     "HINWEIS", "Nominalstil", "Verb nehmen: 'nutzen'."),
    (r"\bzum Einsatz (?:kommen|kommt|gekommen|bringen)\b", "HINWEIS",
     "Nominalstil", "Verb nehmen: 'einsetzen', 'nutzen'."),
    (r"\bBerücksichtigung finde[nt]\b", "HINWEIS", "Nominalstil",
     "Verb nehmen: 'berücksichtigen'."),
    (r"\beine Entscheidung (?:zu )?treffen\b", "HINWEIS", "Nominalstil",
     "Verb nehmen: 'entscheiden'."),
    (r"\bin Erwägung (?:zu )?ziehen\b", "HINWEIS", "Nominalstil",
     "Verb nehmen: 'überlegen', 'erwägen'."),
    (r"\bzur Anwendung (?:kommen|bringen|kommt)\b", "HINWEIS", "Nominalstil",
     "Verb nehmen: 'anwenden'."),
    (r"\bDurchführung\b", "HINWEIS", "Nominalstil",
     "Verb nehmen: 'machen', 'erledigen'."),
    (r"\bin Kenntnis (?:zu )?setzen\b|\bzur Kenntnis (?:zu )?nehmen\b",
     "HINWEIS", "Nominalstil", "Verb nehmen: 'informieren', 'lesen'."),
    (r"\bUnterstützung (?:zu )?(?:leisten|bieten|anbieten)\b", "HINWEIS",
     "Nominalstil", "Verb nehmen: 'unterstützen', 'helfen'."),
    (r"\bAbhilfe (?:zu )?schaffen\b", "HINWEIS", "Nominalstil",
     "Verb nehmen: 'helfen', 'lösen'."),
    (r"\bSorge (?:zu )?tragen\b", "HINWEIS", "Nominalstil",
     "Verb nehmen: 'sorgen'."),
    (r"\bunter Beweis (?:zu )?stellen\b", "HINWEIS", "Nominalstil",
     "Verb nehmen: 'zeigen', 'beweisen'."),
    (r"\bin Auftrag (?:zu )?geben\b", "HINWEIS", "Nominalstil",
     "Verb nehmen: 'beauftragen'."),
    (r"\bRücksprache (?:zu )?halten\b", "HINWEIS", "Nominalstil",
     "Verb nehmen: 'besprechen', 'nachfragen'."),
    (r"\beine Prüfung (?:zu )?(?:vornehmen|durchführen)\b", "HINWEIS",
     "Nominalstil", "Verb nehmen: 'prüfen'."),
    (r"\bKontakt (?:zu |mit uns )?aufnehmen\b|\bKontaktaufnahme\b", "HINWEIS",
     "Nominalstil", "Konkreter: 'schreiben', 'anrufen', 'Termin buchen'."),
    # --- Fachjargon und Anglizismen --------------------------------------------
    (r"\bLeads?\b|\bConversions?\b|\bConversion[- ]?Rate\b|\bPerformance\b|"
     r"\bSolutions?\b|\bOnboarding\b|\bWorkflows?\b|\bTouchpoints?\b|"
     r"\bCustomer Journey\b|\bAwareness\b|\bCommitment\b|\bInsights?\b|"
     r"\bUse[- ]?Cases?\b|\bROI\b|\bKPIs?\b|\bSaaS\b|\bAPIs?\b|"
     r"\bskalierbar\w*|\bEnd[- ]to[- ]End\b|\bTool[- ]?Stack\b|\bSetup\b|"
     r"\bFeatures?\b|\bBenefits?\b|\bTarget\w*|\bCall[- ]to[- ]Action\b|"
     r"\bStakeholder\w*|\bDeep[- ]?Dive\b|\bFramework\w*", "HINWEIS",
     "Fachjargon",
     "Für Laien kurz erklären oder ein deutsches Wort nehmen "
     "(z. B. Workflow = Ablauf)."),
]

FLOSKELN_RE = [(re.compile(m, re.I), st, kat, tipp)
               for m, st, kat, tipp in FLOSKELN]

# ---------------------------------------------------------------------------
# Regeln: Belege und Recht
# ---------------------------------------------------------------------------
# BELEG: Aussage braucht eine Quelle vom Kunden.
BELEGE = [
    (r"\b\d+(?:[.,]\d+)?\s?%", "Prozentzahl",
     "Quelle? Nur echte, belegbare Zahlen."),
    (r"\b(?:über|mehr als|rund|bereits|schon|knapp|fast|ca\.|circa|"
     r"insgesamt|bisher)\s+\d[\d.,]*\s*\w+", "Mengenangabe",
     "Zahl vom Kunden belegt?"),
    (r"\b\d[\d.]*\s*(?:zufriedene\s+)?(?:Kunden|Kundinnen|Projekte|Aufträge|"
     r"Betriebe|Unternehmen|Websites|Webseiten|Bewertungen|Rezensionen|"
     r"Mitarbeiter\w*|Fahrschüler\w*|Mitglieder|Gäste|Fahrzeuge|Objekte|"
     r"Mandanten|Patienten|Einsätze|Installationen)\b", "Mengenangabe",
     "Zahl vom Kunden belegt?"),
    (r"\b\d+\s*(?:Jahre|Jahren)\s+(?:Erfahrung|am Markt|im Geschäft|"
     r"Tradition|Branchenerfahrung)\b|\bseit (?:über |mehr als )?"
     r"(?:\d{4}|\d+ Jahren|Jahrzehnten|Generationen)\b|\bgegründet \d{4}\b",
     "Erfahrung/Alter", "Jahr vom Kunden belegt?"),
    (r"\b[1-5][,.]\d\s*(?:von 5\s*)?(?:Sternen?|★)|★{3,}|"
     r"\b\d+(?:[.,]\d+)?\s*Sterne\b", "Bewertung",
     "Echt und aktuell? Quelle nennen (z. B. Google-Profil, Stand Datum)."),
    (r"\b\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?\s?(?:€|Euro\b|EUR\b)|"
     r"(?:€|\bEUR)\s?\d", "Preis",
     "Preis vom Kunden bestätigt? Privatkunden: Endpreis inkl. USt."),
    (r"\b(?:innerhalb|binnen|in(?: nur)?)\s+(?:von\s+)?\d+\s*(?:Minuten|"
     r"Stunden|Std\.|Tagen|Tage|Werktagen|Wochen)\b|\b24/7\b|"
     r"\brund um die Uhr\b|\b(?:noch )?am (?:selben|gleichen) (?:Werk)?[Tt]ag\b|"
     r"\binnerhalb eines (?:Werk)?[Tt]ages\b|\b(?:antwort\w*|meld\w*|reagier\w*|"
     r"komm\w*|hilf\w*|helfe\w*|liefer\w*|ist|sind|bin)\s+sofort\b|"
     r"\bsofort (?:erreichbar|verfügbar|lieferbar|vor Ort|da|einsatzbereit|"
     r"startklar|loslegen)\b", "Zeitzusage",
     "Hält der Kunde das immer ein? Nur zusagen, was belegt ist."),
    (r"\b\d{1,2}(?:[:.]\d{2})?\s*(?:bis|–|-)\s*\d{1,2}(?:[:.]\d{2})?\s*Uhr\b|"
     r"\bzwischen \d{1,2}(?:[:.]\d{2})? und \d{1,2}(?:[:.]\d{2})? Uhr\b|"
     r"\b(?:Mo|Di|Mi|Do|Fr|Sa|So)(?:ntag|nstag|ttwoch|nnerstag|eitag|mstag|"
     r"nntag)?\.?\s*(?:–|-|bis)\s*(?:Mo|Di|Mi|Do|Fr|Sa|So)\w*\.?|"
     r"\bab \d{1,2}(?:[:.]\d{2})? Uhr\b", "Öffnungszeit",
     "Zeiten vom Kunden? Genau gleich wie im Google-Unternehmensprofil?"),
    (r"\bGarantie\w*|\bgarantier\w*", "Garantie",
     "Echte Garantie? Bedingungen nennen (§ 479 BGB): Inhalt, Dauer, "
     "Garantiegeber, gesetzliche Rechte bleiben und sind kostenlos."),
    (r"\bkostenlos\w*|\bkostenfrei\w*|\bgratis\b|\bumsonst\b|"
     r"\bunverbindlich\w*|\bohne (?:versteckte )?Kosten\b|"
     r"\bkeine (?:versteckten )?Kosten\b", "Kostenlos",
     "Wirklich ohne Kosten und Bedingungen? (UWG Anhang Nr. 21)"),
    (r"\bMeisterbetrieb\w*|\bMeister(?:in)?\b|\bMeisterbrief\w*|"
     r"\bInnungsbetrieb\w*|\bInnungsmitglied\w*|\bFachbetrieb\w*|"
     r"\bzertifiziert\w*|\bTÜV\w*|\bDEKRA\b|\bISO[ -]?\d+|\bTestsieger\w*|"
     r"\bausgezeichnet\b|\bprämiert\w*|\bSiegel\w*|\bFachanw[aä]lt\w*|"
     r"\bSpezialist\w*|\bExpert(?:e|en|in|innen)\b|\b\w+-geprüft\w*|"
     r"\bstaatlich geprüft\w*|"
     r"\bstaatlich anerkannt\w*|\bakkreditiert\w*",
     "Titel/Nachweis",
     "Nachweis vorhanden? Nur echte Titel, Siegel und Mitgliedschaften."),
    (r"\bFestpreis\w*|\bPreisgarantie\w*|\bBestpreis\w*|\bTiefpreis\w*",
     "Preiszusage", "Wirklich fest? Was ist enthalten, was nicht?"),
]
BELEGE_RE = [(re.compile(m, re.I), kat, tipp) for m, kat, tipp in BELEGE]

# RECHT: Formulierungen mit Abmahnrisiko (kein Rechtsrat).
RECHT = [
    (r"\b(?:der|die|das|den|dem|unsere?n?)?\s?(?:beste|bester|bestes|"
     r"besten|größte\w*|günstigste\w*|billigste\w*|schnellste\w*|"
     r"führende\w*|preiswerteste\w*|erfahrenste\w*)\b(?!\s+"
     r"(?:Grüße|Wünsche))", "WARNUNG", "Spitzenstellung",
     "Superlativ nur, wenn objektiv belegbar (§ 5 UWG). Sonst konkrete "
     "Tatsache statt Superlativ."),
    (r"\b(?:der|die|das|den|dem)\s+einzige[nrs]?\b", "HINWEIS",
     "Spitzenstellung",
     "Alleinstellung ('der einzige Anbieter')? Nur mit Beleg (§ 5 UWG)."),
    (r"\bNr\.?\s?1\b|\bNummer\s?(?:1|eins)\b|\bMarktführer\w*|"
     r"\berste Wahl\b|\berste Adresse\b", "WARNUNG", "Spitzenstellung",
     "Alleinstellung nur mit Beleg (§ 5 UWG)."),
    (r"\beinzigartig\w*|\bunschlagbar\w*|\bkonkurrenzlos\w*|"
     r"\bunvergleichlich\w*|\bunübertroffen\w*|\bweltweit erste\w*",
     "WARNUNG", "Spitzenstellung", "Alleinstellung nur mit Beleg (§ 5 UWG)."),
    (r"\b100\s?%\s?(?:zufrieden\w*|sicher\w*|garantiert\w*|"
     r"Zufriedenheit\w*|Erfolg\w*|kostenlos\w*)", "WARNUNG", "Spitzenstellung",
     "Absolute Zusage. Belegbar?"),
    (r"\b(?:2|zwei|24)\s+(?:Jahre|Monate)\s+(?:gesetzliche\s+)?"
     r"Gewährleistung\b|\bgesetzliche\w* Gewährleistung\b|"
     r"\b14[- ]?(?:Tage|tägige\w*)\s+(?:Widerrufsrecht|Rückgaberecht|"
     r"Widerruf)\b", "WARNUNG", "Selbstverständlichkeit",
     "Gesetzliche Rechte nicht als Vorteil bewerben (UWG Anhang Nr. 10)."),
    (r"\bDSGVO[- ]?konform\w*|\bdatenschutzkonform\w*|"
     r"\brechtssicher\w*", "HINWEIS", "Selbstverständlichkeit",
     "Pflicht, kein Vorteil. Konkreter: z. B. 'Daten bleiben auf Servern in "
     "Deutschland', wenn das stimmt."),
    (r"\bnur (?:noch )?heute\b|\bnur noch \d+\b|\bletzte Chance\b|"
     r"\bAngebot endet\b|\bnur (?:für )?kurze Zeit\b|\bbegrenzte "
     r"(?:Plätze|Anzahl|Stückzahl|Kapazität\w*)\b|\bsolange (?:der )?Vorrat "
     r"reicht\b|\bnur noch wenige\b|\bschnell sein\b", "WARNUNG",
     "Verknappung",
     "Knappheit nur, wenn sie stimmt (UWG Anhang Nr. 7). Keine "
     "Dauer-Countdowns."),
    (r"\bKundenstimme\w*|\bBewertung(?:en)?\b|\bRezension\w*|"
     r"\bTestimonial\w*|\bErfahrungsberichte?\b|\bReferenzen\b", "HINWEIS",
     "Bewertungen",
     "Nur echte Stimmen mit Erlaubnis. Bei angezeigten Bewertungen sagen, "
     "ob und wie ihre Echtheit geprüft wird (§ 5b Abs. 3 UWG)."),
    (r"\bheil(?:t|en|ung)\b|\bschmerzfrei\w*|\bohne Nebenwirkung\w*|"
     r"\bfaltenfrei\w*|\bverjüng\w*|\bwunder\w*|\bentgift\w*|"
     r"\bgarantierte[nr]? (?:Erfolg|Ergebnis|Gewichtsverlust)\w*",
     "WARNUNG", "Gesundheit",
     "Heilmittelwerbegesetz: keine Heil- oder Erfolgsversprechen."),
    (r"\bvorher[- /]+nachher\b", "HINWEIS", "Gesundheit",
     "Vorher-Nachher-Bilder bei ästhetischen Eingriffen (auch Unterspritzungen)"
     " sind nach § 11 HWG verboten."),
    (r"\b(?:günstiger|billiger|besser|schneller|preiswerter|zuverlässiger|"
     r"hochwertiger|erfahrener|persönlicher)\s+als\s+(?:die\s+|der\s+|bei\s+|"
     r"viele\s+)?(?:Konkurrenz|Wettbewerb\w*|andere\w*|Agenturen|Mitbewerber\w*|"
     r"[A-ZÄÖÜ]\w+-?Anbieter\w*)\b|\bim (?:Gegensatz|Vergleich|Unterschied) zu "
     r"(?:anderen|der Konkurrenz|herkömmlichen|klassischen|vielen)\b|"
     r"\banders als (?:andere|die Konkurrenz|viele)\b|\bunter (?:dem )?"
     r"Markt(?:niveau|preis\w*|durchschnitt)\b", "HINWEIS", "Vergleich",
     "Vergleich mit anderen oder dem Markt nur sachlich und belegbar "
     "(§ 5, § 6 UWG)."),
]
RECHT_RE = [(re.compile(m, re.I), st, kat, tipp) for m, st, kat, tipp in RECHT]

PLATZHALTER = re.compile(
    r"\[(?:FEHLT|OFFEN|PLATZHALTER|TODO|TBD|XXX|PRÜFEN|PRUEFEN|NAME|ORT|"
    r"PREIS|ZAHL|DATUM|KUNDE|FIRMA|TELEFON|ADRESSE)\b[^\]]*\]|lorem ipsum|"
    r"\bTODO\b|\bXXX+\b|\bMusterstra(?:ß|ss)e\b|\bMax Mustermann\b|"
    r"\bErika Mustermann\b|\bMusterfirma\b|\bexample\.(?:com|org|de|net)\b|"
    r"\b[\w.-]+\.example\b|\b0123[ -/]?456\s?789\b|\{\{[^}]+\}\}|"
    r"\[(?:Ihr|Ihre|dein|deine)\s[^\]]{1,30}\]", re.I)

# ---------------------------------------------------------------------------
# Regeln: Buttons, Links, Typografie
# ---------------------------------------------------------------------------

GENERISCHE_BUTTONS = {
    "mehr erfahren", "erfahren sie mehr", "erfahre mehr", "mehr", "mehr dazu",
    "weiterlesen", "weiter lesen", "mehr lesen", "hier", "hier klicken",
    "klicken sie hier", "klick hier", "jetzt klicken", "absenden", "senden",
    "abschicken", "submit", "send", "ok", "okay", "los", "los geht's",
    "los gehts", "entdecken", "jetzt entdecken", "entdecken sie", "mehr entdecken",
    "learn more", "read more", "click here", "details", "mehr details",
    "mehr infos", "infos", "info", "mehr info", "hier entlang", "go",
    "jetzt", "zum angebot",
}
SCHWACHE_BUTTONS = {
    "weiter", "anfragen", "jetzt anfragen", "kontakt", "kontaktieren",
    "jetzt kontaktieren", "kontaktieren sie uns", "kontakt aufnehmen",
    "start", "starten", "jetzt starten", "auswählen", "bestätigen",
    "anmelden", "jetzt anmelden", "registrieren", "bestellen", "buchen",
    "jetzt buchen", "jetzt bestellen", "angebot", "termin",
}
GENERISCHE_LINKS = {
    "hier", "mehr", "link", "diese seite", "weiter", "klicken", "hier klicken",
    "mehr erfahren", "weiterlesen", "mehr lesen", "details", "lesen",
    "klick", "dort", "diesen link", "hier entlang", "read more", "click here",
    "more", "here", "info", "infos",
}
AKRONYME = {
    "KI", "SEO", "DSGVO", "PDF", "CRM", "ERP", "API", "URL", "WLAN", "KFZ",
    "PKW", "LKW", "TÜV", "HWK", "IHK", "AGB", "FAQ", "SHK", "CSS", "HTML",
    "JSON", "IBAN", "BIC", "DATEV", "SAP", "USA", "EU", "UWG", "BGB", "HWG",
    "PAngV", "GEG", "DEKRA", "ISO", "DIN", "GPS", "USB", "LED", "TV", "IT",
    "EDV", "CAD", "BAföG", "ADAC", "GTÜ", "MPU", "WC", "ZDF", "ARD", "GPT",
    "AI", "UI", "UX", "SMS", "NFC", "QR", "RSS", "SSL", "TLS", "DNS", "VPN",
    "MwSt", "USt", "GmbH", "KG", "AG", "OHG", "UG", "BFSG", "WCAG", "AOK",
    "DAK", "BMW", "VW", "HUK", "ARAG", "WMF", "BWL", "VWL", "NRW", "OWL",
    "AZAV", "WHG", "VOB", "HOAI", "SB", "ÖPNV", "ICE", "IC", "DB", "BIO",
    "CEO", "B2B", "B2C", "PV", "KWK", "ABS", "ESP", "SUV", "MBA", "IHK",
    "JARVIS", "N8N", "LYRO", "TIDIO",
}
EMOJI = re.compile("[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-"
                   "\U0001F2FF\U0001F900-\U0001F9FF]")

TYPOGRAFIE = [
    (re.compile(r"\"[^\"\n]{1,200}\""), "HINWEIS", "Anführungszeichen",
     "Deutsche Anführungszeichen „…“ statt \"…\"."),
    (re.compile(r"\.\.\."), "HINWEIS", "Auslassung",
     "Auslassungszeichen … statt drei Punkte."),
    (re.compile(r"\w—\w|\s—\s|—"), "HINWEIS", "Geviertstrich",
     "Langer Strich — ist im Deutschen unüblich und gilt als KI-Merkmal. "
     "Gedankenstrich – mit Leerzeichen oder einen Punkt setzen."),
    (re.compile(r"(?<=\w) - (?=\w)"), "HINWEIS", "Bindestrich als Strich",
     "Gedankenstrich – statt Bindestrich - (oder Satz teilen)."),
    (re.compile(r"\d€|\d(?:EUR|Euro)\b"), "HINWEIS", "Betrag",
     "Leerzeichen vor dem Währungszeichen: 39,99 €."),
    (re.compile(r"€\s?\d"), "HINWEIS", "Betrag",
     "Betrag vor das Zeichen: 39,99 € statt € 39,99."),
    (re.compile(r"\b\d+\.\d{2}\s?€"), "HINWEIS", "Betrag",
     "Komma als Dezimalzeichen: 39,99 €."),
    (re.compile(r"\d%"), "HINWEIS", "Prozent",
     "Leerzeichen vor %: 20 % (am besten geschütztes Leerzeichen)."),
    (re.compile(r"\b(?:z\.B\.|d\.h\.|u\.a\.|z\.T\.|o\.ä\.|u\.U\.|i\.d\.R\.)"),
     "HINWEIS", "Abkürzung",
     "Mit Leerzeichen: z. B., d. h., u. a. (oder ausschreiben)."),
    (re.compile(r"!{2,}|\?!|!\?"), "WARNUNG", "Satzzeichen",
     "Mehrfache Satzzeichen wirken unseriös."),
    (re.compile(r"\b(\w{2,})\s+\1\b"), "HINWEIS", "Doppeltes Wort",
     "Tippfehler? Wort steht zweimal."),
]

# ---------------------------------------------------------------------------
# Prüfung
# ---------------------------------------------------------------------------


class Pruefung:
    def __init__(self, bloecke, info, anrede=None, ort=None):
        self.bloecke = bloecke
        self.info = info
        self.anrede = anrede
        self.ort = ort
        self.funde = []
        self._gesehen = set()
        self.kennzahlen = {}
        self._akt = None          # Block, zu dem der nächste Fund gehört
        self.abschnitt = {}       # Block -> Überschrift davor
        aktuell = ""
        for b in bloecke:
            if b.art in UEBERSCHRIFTEN or b.art == "summary":
                aktuell = b.text.replace("\n", " ")
            self.abschnitt[id(b)] = aktuell

    def fund(self, stufe, regel, text, ort, tipp, schluessel=None):
        key = (stufe, regel, schluessel if schluessel is not None else text)
        if key in self._gesehen:
            for f in self.funde:
                if (f["stufe"], f["regel"], f.get("_key")) == key:
                    f["anzahl"] += 1
                    break
            return
        self._gesehen.add(key)
        abschnitt = ""
        if self._akt is not None and self._akt.art not in UEBERSCHRIFTEN \
                and self._akt.art not in ("title", "meta"):
            abschnitt = self.abschnitt.get(id(self._akt), "")
        self.funde.append({"stufe": stufe, "regel": regel, "text": text,
                           "ort": ort, "abschnitt": abschnitt, "tipp": tipp,
                           "anzahl": 1, "_key": key[2]})

    # -- Hilfen ------------------------------------------------------------------
    def texte(self, arten):
        return [b for b in self.bloecke if b.art in arten and b.text]

    @staticmethod
    def ausschnitt(text, start=None, ende=None, breite=45):
        text = text.replace("\n", " ")
        if start is None:
            return text if len(text) <= 2 * breite + 10 else \
                text[:2 * breite].rstrip() + " …"
        a = max(0, start - breite)
        e = min(len(text), ende + breite)
        s = text[a:e].strip()
        return ("… " if a > 0 else "") + s + (" …" if e < len(text) else "")

    @staticmethod
    def ort_name(art):
        return {"title": "Title", "meta": "Meta-Description", "p": "Absatz",
                "li": "Liste", "text": "Text", "quote": "Zitat",
                "caption": "Bildtext", "td": "Tabelle", "dd": "Text",
                "summary": "Frage", "button": "Button", "link": "Link",
                "img": "Alt-Text", "label": "Feldname", "feld": "Formular"
                }.get(art, art.upper() if art in UEBERSCHRIFTEN else art)

    # -- Einzelprüfungen -----------------------------------------------------------
    def pruefe_platzhalter(self):
        plan = self.info.get("textplan")
        for b in self.bloecke:
            self._akt = b
            for m in PLATZHALTER.finditer(b.text):
                if plan and m.group(0).upper().startswith(("[FEHLT", "[OFFEN",
                                                           "[PRÜFEN")):
                    self.fund("HINWEIS", "Offener Punkt", m.group(0),
                              self.ort_name(b.art),
                              "Im Textplan erlaubt. Vor dem Einbau beim Kunden "
                              "klären oder das Element weglassen.")
                else:
                    self.fund("FEHLER", "Platzhalter", self.ausschnitt(
                        b.text, m.start(), m.end()), self.ort_name(b.art),
                        "Vor der Veröffentlichung ersetzen oder das Element "
                        "weglassen. Nichts erfinden.")

    def pruefe_floskeln(self):
        for b in self.texte(LESBARE | {"title", "meta", "link", "img"}):
            self._akt = b
            treffer = []
            for rx, stufe, kat, tipp in FLOSKELN_RE:
                for m in rx.finditer(b.text):
                    treffer.append((m.start(), m.end(), m.group(0).strip(),
                                    stufe, kat, tipp))
            # längere Treffer zuerst; was darin steckt, nicht doppelt melden
            treffer.sort(key=lambda t: -(t[1] - t[0]))
            belegt = []
            for start, ende, wort, stufe, kat, tipp in treffer:
                if any(a <= start and ende <= e for a, e in belegt):
                    continue
                belegt.append((start, ende))
                self.fund(stufe, kat + ": " + wort.lower(),
                          self.ausschnitt(b.text, start, ende),
                          self.ort_name(b.art), tipp, schluessel=wort.lower())

    def pruefe_recht_und_belege(self):
        for nr, b in enumerate(self.texte(LESBARE | {"title", "meta", "link",
                                                    "img"})):
            self._akt = b
            gesammelt = {}
            zeigt_bewertung = (b.art in UEBERSCHRIFTEN or b.art == "quote" or
                               re.search(r"[★⭐„“\"»«]|\bSterne", b.text)) and \
                not re.search(r"\b(?:prüfen|geprüft|verifiziert|Echtheit|"
                              r"stammen (?:aus|von)|bitte\w*|bittet|"
                              r"gebeten|anfrag\w*|fragt|einhol\w*)\b|"
                              r"\w-Anfrage\b", b.text, re.I)
            for rx, stufe, kat, tipp in RECHT_RE:
                if kat == "Bewertungen" and not zeigt_bewertung:
                    continue
                for m in rx.finditer(b.text):
                    wort = re.sub(r"\s+", " ", m.group(0).strip())
                    if kat == "Spitzenstellung" and re.match(
                            r"^(?:der|die|das|den|dem|unsere?n?)?\s?"
                            r"(?:beste[nrs]?)$", wort, re.I):
                        # "am besten", "bestens" sind keine Spitzenstellung
                        vor = b.text[max(0, m.start() - 4):m.start()].lower()
                        if vor.endswith("am ") or vor.endswith("im "):
                            continue
                    g = gesammelt.setdefault(("R", stufe, kat), [m, tipp, []])
                    if wort not in g[2]:
                        g[2].append(wort)
            for rx, kat, tipp in BELEGE_RE:
                for m in rx.finditer(b.text):
                    wort = re.sub(r"\s+", " ", m.group(0).strip())
                    g = gesammelt.setdefault(("B", "BELEG", kat), [m, tipp, []])
                    if wort not in g[2]:
                        g[2].append(wort)
            if b.art == "quote":
                gesammelt.setdefault(("B", "BELEG", "Kundenstimme"), [
                    re.match(r"", b.text), "Echt, wörtlich und mit Erlaubnis? "
                    "Name nur mit Einwilligung. Bearbeitet? Dann nur gekürzt, "
                    "nie im Sinn verändert.", []])
            for (typ, stufe, kat), (m, tipp, treffer) in gesammelt.items():
                text = self.ausschnitt(b.text, m.start(), m.end())
                if len(treffer) > 1:
                    text += " [Treffer: %s]" % ", ".join(treffer[:5])
                regel = ("Recht: " + kat) if typ == "R" else kat
                self.fund(stufe, regel, text, self.ort_name(b.art), tipp,
                          schluessel="%s|%d" % (kat, nr))

    def pruefe_saetze(self):
        prosa = self.texte(PROSA | {"meta"})
        lang_s, sehr_lang = [], []
        for b in prosa:
            for s in saetze(b.text):
                n = len(woerter(s))
                if n > 25:
                    sehr_lang.append((n, s, b))
                elif n > 20:
                    lang_s.append((n, s, b))
        for n, s, b in sorted(sehr_lang, key=lambda x: -x[0]):
            self._akt = b
            self.fund("WARNUNG", "Satz über 25 Wörter", "(%d Wörter) %s" % (
                n, self.ausschnitt(s)), self.ort_name(b.art),
                "Teilen. Ein Gedanke pro Satz. Ziel: im Schnitt unter 15 Wörter.")
        for n, s, b in sorted(lang_s, key=lambda x: -x[0]):
            self._akt = b
            self.fund("HINWEIS", "Satz über 20 Wörter", "(%d Wörter) %s" % (
                n, self.ausschnitt(s)), self.ort_name(b.art),
                "Kürzen oder teilen, wenn es geht.")
        # Satzanfänge
        paare = []                  # (Satz, Block)
        for b in prosa:
            paare.extend((s, b) for s in saetze(b.text))
        alle = [s for s, _ in paare]
        for i in range(len(paare) - 2):
            erste = [(woerter(s) or [""])[0].lower() for s, _ in paare[i:i + 3]]
            if erste[0] and len(erste[0]) > 1 and erste[0] == erste[1] == erste[2]:
                self._akt = paare[i][1]
                self.fund("HINWEIS", "Gleiche Satzanfänge",
                          "3× '%s …': %s" % (erste[0], self.ausschnitt(alle[i])),
                          self.ort_name(paare[i][1].art),
                          "Satzanfänge abwechseln.",
                          schluessel=erste[0] + str(i // 3))
        # Passiv (Seitenwert)
        self._akt = None
        passiv = []
        for s in alle:
            if re.search(r"\b(?:wird|werden|wurde|wurden|worden)\b", s) and \
                    re.search(PARTIZIP, s) and not re.search(
                        r"\bwerden (?:Sie|wir|du|ihr)\b(?!.*\bvon\b)", s):
                passiv.append(s)
        if len(alle) >= 5 and len(passiv) / len(alle) > 0.2:
            self.fund("HINWEIS", "Viel Passiv", "%d von %d Sätzen, z. B.: %s" % (
                len(passiv), len(alle), self.ausschnitt(passiv[0])), "Seite",
                "Aktiv schreiben: Wer macht was? 'Wir prüfen Ihre Heizung' statt "
                "'Ihre Heizung wird geprüft'.")
        # Nominalstil
        for s, b in paare:
            nomen = re.findall(r"\b[A-ZÄÖÜ][a-zäöüß]{3,}(?:ung|ungen|heit|heiten|"
                               r"keit|keiten|ion|ionen|ität|itäten|nahme|nahmen)\b",
                               s)
            if len(nomen) >= 3:
                self._akt = b
                self.fund("HINWEIS", "Nominalstil", "%s (%s)" % (
                    self.ausschnitt(s), ", ".join(nomen[:4])),
                    self.ort_name(b.art),
                    "Verben statt -ung-Wörter: 'Wir planen Ihre Website' statt "
                    "'Planung und Umsetzung Ihrer Website'.")
        self._akt = None

    def pruefe_lesbarkeit(self):
        texte = [b.text for b in self.texte(PROSA)
                 if len(woerter(b.text)) >= 4]
        werte = lesbarkeit(texte)
        if not werte:
            return
        self.kennzahlen.update(werte)
        if werte["amstad"] < 50:
            self.fund("WARNUNG", "Lesbarkeit niedrig",
                      "Flesch-Amstad %d (%s), Wiener Sachtextformel %s" % (
                          werte["amstad"], amstad_stufe(werte["amstad"]),
                          zahl(werte["wstf"])), "Seite",
                      "Ziel: Flesch-Amstad ab 60. Kürzere Sätze, kürzere Wörter, "
                      "Fachwörter erklären.")
        elif werte["amstad"] < 60:
            self.fund("HINWEIS", "Lesbarkeit mittel",
                      "Flesch-Amstad %d (%s), Wiener Sachtextformel %s" % (
                          werte["amstad"], amstad_stufe(werte["amstad"]),
                          zahl(werte["wstf"])), "Seite",
                      "Ziel: ab 60. Einfache Texte verkaufen messbar besser.")
        if werte["asl"] > 15:
            self.fund("HINWEIS", "Lange Sätze im Schnitt",
                      "Ø %s Wörter pro Satz" % zahl(werte["asl"]), "Seite",
                      "Ziel: im Schnitt unter 15 Wörter.")

    def pruefe_anrede(self):
        texte = [b.text for b in self.texte(LESBARE | {"title", "meta", "link"})]
        formell, informell = [], []
        for t in texte:
            for s in saetze(t):
                w = woerter(s)
                for i, x in enumerate(w):
                    if x in ("Sie", "Ihnen", "Ihr", "Ihre", "Ihrem", "Ihren",
                             "Ihrer", "Ihres"):
                        if i > 0 or x in ("Ihnen",) or len(w) <= 6:
                            formell.append(s)
                    if x.lower() in ("du", "dich", "dir", "dein", "deine",
                                     "deinem", "deinen", "deiner", "deines",
                                     "euch", "euer", "eure", "eurem", "euren",
                                     "eurer"):
                        informell.append(s)
        self.kennzahlen["anrede_sie"] = len(formell)
        self.kennzahlen["anrede_du"] = len(informell)
        if formell and informell:
            self.fund("FEHLER", "Sie und du gemischt",
                      "Sie: „%s“ / du: „%s“" % (self.ausschnitt(formell[0], breite=30),
                                                self.ausschnitt(informell[0], breite=30)),
                      "Seite", "Eine Anrede für die ganze Seite.")
        elif self.anrede == "sie" and informell:
            self.fund("FEHLER", "Falsche Anrede (du statt Sie)",
                      self.ausschnitt(informell[0]), "Seite",
                      "Vorgabe ist Sie.")
        elif self.anrede == "du" and formell:
            self.fund("FEHLER", "Falsche Anrede (Sie statt du)",
                      self.ausschnitt(formell[0]), "Seite", "Vorgabe ist du.")
        # Kundenfokus
        wir = kunde = 0
        wir_start = saetze_n = 0
        for t in texte:
            wir += len(re.findall(r"\b(?:wir|uns|unser\w*)\b", t, re.I))
            kunde += len(re.findall(
                r"\b(?:Sie|Ihnen|Ihr|Ihre|Ihrem|Ihren|Ihrer|Ihres)\b", t))
            kunde += len(re.findall(
                r"\b(?:du|dich|dir|dein\w*|euch|euer|eure\w*)\b", t, re.I))
        for b in self.texte(PROSA):
            for s in saetze(b.text):
                saetze_n += 1
                if re.match(r"^\W*(?:Wir|Unser\w*)\b", s):
                    wir_start += 1
        self.kennzahlen["wir"] = wir
        self.kennzahlen["kunde"] = kunde
        if wir >= 5 and wir > kunde * 1.5:
            self.fund("WARNUNG", "Text redet über sich",
                      "wir/uns/unser %d× · Sie/Ihr %d×" % (wir, kunde), "Seite",
                      "Aus Kundensicht schreiben: Was hat der Besucher davon?")
        elif wir >= 5 and wir > kunde:
            self.fund("HINWEIS", "Mehr wir als Sie",
                      "wir/uns/unser %d× · Sie/Ihr %d×" % (wir, kunde), "Seite",
                      "Ziel: Der Kunde kommt öfter vor als der Betrieb.")
        if saetze_n >= 8 and wir_start / saetze_n > 0.25:
            self.fund("HINWEIS", "Viele Sätze beginnen mit 'Wir'",
                      "%d von %d Sätzen" % (wir_start, saetze_n), "Seite",
                      "Mit dem Kunden oder dem Ergebnis beginnen.")

    def pruefe_ueberschriften(self):
        hs = [b for b in self.bloecke if b.art in UEBERSCHRIFTEN]
        h1 = [b for b in hs if b.art == "h1"]
        ist_seite = self.info.get("html") or self.info.get("textplan")
        if ist_seite and not h1:
            self.fund("WARNUNG", "Keine H1", "–", "Seite",
                      "Genau eine H1: Was ist es, für wen oder wo?")
        if len(h1) > 1:
            self.fund("HINWEIS", "Mehrere H1", " | ".join(
                self.ausschnitt(b.text, breite=20) for b in h1[:3]), "Seite",
                "Eine H1 pro Seite ist am klarsten.")
        for b in h1:
            n = len(woerter(b.text))
            if n > 10 or len(b.text) > 70:
                self.fund("HINWEIS", "H1 lang", "(%d Wörter) %s" % (
                    n, self.ausschnitt(b.text)), "H1",
                    "2 bis 8 Wörter: Kategorie plus für wen oder wo.")
        letzte = 0
        for b in hs:
            ebene = int(b.art[1])
            if letzte and ebene > letzte + 1:
                self.fund("HINWEIS", "Überschriften-Ebene übersprungen",
                          "%s nach H%d: %s" % (b.art.upper(), letzte,
                                               self.ausschnitt(b.text, breite=25)),
                          b.art.upper(),
                          "Ebenen nicht überspringen (Barrierefreiheit).")
            letzte = ebene
            t = b.text.strip()
            if t.endswith("!"):
                self.fund("HINWEIS", "Ausrufezeichen in Überschrift", t,
                          b.art.upper(), "Ruhige Aussage wirkt seriöser.")
            if t.endswith("?") and ebene <= 2:
                self.fund("HINWEIS", "Frage als Überschrift", t, b.art.upper(),
                          "Im FAQ gut. Sonst ist eine klare Aussage meist "
                          "stärker. Bewusst gewählt? Dann lassen.")
            if re.match(r"^[^:]{3,40}:\s+\S", t) and ebene <= 3:
                self.fund("HINWEIS", "Doppelpunkt-Überschrift", t,
                          b.art.upper(),
                          "KI-typisches Muster ('X: Der Schlüssel zu Y'). "
                          "Lieber eine klare Aussage.")
            if len(woerter(t)) > 12:
                self.fund("HINWEIS", "Überschrift lang", self.ausschnitt(t),
                          b.art.upper(), "Überschriften bis ca. 8 Wörter.")
            if EMOJI.search(t):
                self.fund("HINWEIS", "Emoji in Überschrift", t, b.art.upper(),
                          "Wirkt verspielt und nach Vorlage. Weglassen.")

    def pruefe_buttons_links(self):
        buttons = [b for b in self.bloecke if b.art == "button"]
        labels = {}
        for b in buttons:
            self._akt = b
            t = re.sub(r"[\s→›»>←‹«<↗→⟶➜➔]+$", "", b.text).strip()
            t = re.sub(r"^[\s→›»>←‹«<]+", "", t).strip()
            if not t:
                if not b.attrs.get("aria"):
                    self.fund("WARNUNG", "Button ohne Text", b.attrs.get(
                        "href", "") or "–", "Button",
                        "Sichtbaren Text oder aria-label vergeben.")
                continue
            low = t.lower().rstrip("!.")
            if low in GENERISCHE_BUTTONS:
                self.fund("WARNUNG", "Nichtssagender Button", t, "Button",
                          "Verb + was man bekommt: 'Angebot anfordern', "
                          "'Termin buchen', 'Demo testen'.", schluessel=low)
            elif low in SCHWACHE_BUTTONS:
                self.fund("HINWEIS", "Schwacher Button", t, "Button",
                          "Verb ohne Ergebnis. Besser mit Objekt: 'Rückruf "
                          "anfordern', 'Probetraining buchen'.", schluessel=low)
            n = len(woerter(t))
            if n > 6 or len(t) > 40:
                self.fund("HINWEIS", "Button-Text lang", t, "Button",
                          "2 bis 5 Wörter.")
            if "!" in t:
                self.fund("HINWEIS", "Ausrufezeichen im Button", t, "Button",
                          "Ruhiger wirkt seriöser.")
            if EMOJI.search(t):
                self.fund("HINWEIS", "Emoji im Button", t, "Button",
                          "Weglassen.")
            href = b.attrs.get("href", "")
            if href and not href.startswith("#") or href not in ("", "#"):
                labels.setdefault(href, set()).add(t)
        self._akt = None
        verschieden = {t for b in buttons for t in [b.text.strip()] if t}
        self.kennzahlen["buttons"] = len(verschieden)
        if len(verschieden) > 10:
            self.fund("HINWEIS", "Viele verschiedene Buttons",
                      "%d Beschriftungen" % len(verschieden), "Seite",
                      "Wenige Aktionen, jede mit einem festen Wortlaut.")
        for href, ts in labels.items():
            if len(ts) > 1 and href not in ("", "#"):
                self.fund("HINWEIS", "Ein Ziel, mehrere Wortlaute",
                          "%s → %s" % (href[:40], " | ".join(sorted(ts))[:120]),
                          "Button", "Dieselbe Aktion überall gleich benennen.",
                          schluessel=href)
        for b in self.bloecke:
            if b.art != "link":
                continue
            self._akt = b
            t = b.text.strip().lower().rstrip(".!:")
            if not t and not b.attrs.get("aria"):
                if b.attrs.get("href"):
                    self.fund("WARNUNG", "Link ohne Text", b.attrs["href"][:60],
                              "Link", "Text oder aria-label vergeben "
                              "(Screenreader).")
            elif t in GENERISCHE_LINKS:
                self.fund("WARNUNG", "Nichtssagender Linktext", b.text.strip(),
                          "Link", "Linktext sagt, wohin er führt: 'Preise "
                          "ansehen' statt 'hier'.", schluessel=t)

    def pruefe_bilder(self):
        for b in self.bloecke:
            if b.art != "img":
                continue
            self._akt = b
            src = b.attrs.get("src", "")
            if not b.attrs.get("hat_alt", True):
                self.fund("FEHLER", "Bild ohne alt", src[-60:] or "–",
                          "Alt-Text", "alt-Text ergänzen. Dekoration: alt=\"\".")
                continue
            t = b.text.strip()
            if not t:
                continue
            if re.match(r"^(?:Bild|Foto|Grafik|Abbildung|Image|Picture|Photo)"
                        r"\b", t, re.I):
                self.fund("HINWEIS", "Alt-Text beginnt mit 'Bild'", t,
                          "Alt-Text", "Direkt beschreiben, was zu sehen ist.")
            if re.search(r"\.(?:jpe?g|png|webp|gif|svg|avif)\b", t, re.I) or \
                    re.match(r"^[\w-]+_\w+[\w-]*$", t):
                self.fund("WARNUNG", "Alt-Text ist ein Dateiname", t,
                          "Alt-Text", "Beschreiben, was das Bild zeigt.")
            if len(t) > 150:
                self.fund("HINWEIS", "Alt-Text lang", self.ausschnitt(t),
                          "Alt-Text", "Kurz halten (bis ca. 125 Zeichen).")

    def pruefe_formular(self):
        felder = [b.attrs for b in self.bloecke if b.art == "feld"]
        sichtbar = [f for f in felder if f["typ"] not in ("hidden",)]
        for f in sichtbar:
            name = f.get("name") or f.get("id") or f.get("typ")
            if not f.get("beschriftet"):
                if f.get("placeholder"):
                    self.fund("WARNUNG", "Platzhalter statt Feldname",
                              "%s: „%s“" % (name, f["placeholder"]), "Formular",
                              "Sichtbares Label über dem Feld. Platzhalter "
                              "verschwindet beim Tippen.", schluessel=name)
                elif f["typ"] not in ("checkbox", "radio", "submit"):
                    self.fund("WARNUNG", "Feld ohne Beschriftung", name,
                              "Formular", "Label ergänzen.", schluessel=name)
        texte = [f for f in sichtbar if f["typ"] not in ("checkbox", "radio")]
        if len(texte) > 6:
            self.fund("HINWEIS", "Viele Formularfelder",
                      "%d Felder" % len(texte), "Formular",
                      "Jedes Feld kostet Anfragen. Nur fragen, was für die "
                      "erste Antwort nötig ist.")

    def pruefe_seo(self):
        titles = [b.text for b in self.bloecke if b.art == "title"]
        metas = [b.text for b in self.bloecke if b.art == "meta"]
        ist_html = self.info.get("html")
        ist_plan = self.info.get("textplan")
        if ist_html and not titles:
            self.fund("FEHLER", "Kein <title>", "–", "Title",
                      "Title setzen: Leistung + Ort + Name, bis ca. 60 Zeichen.")
        if ist_plan and not titles:
            self.fund("HINWEIS", "Kein Title im Textplan", "–", "Title",
                      "Title ergänzen: Leistung + Ort + Name.")
        for t in titles:
            if len(t) > 60:
                self.fund("HINWEIS", "Title lang", "(%d Zeichen) %s" % (
                    len(t), t), "Title",
                    "Google kürzt ab ca. 55 bis 60 Zeichen. Wichtiges nach vorn.")
            elif len(t) < 25:
                self.fund("HINWEIS", "Title kurz", "(%d Zeichen) %s" % (
                    len(t), t), "Title",
                    "Leistung + Ort + Name nutzen den Platz besser.")
        if (ist_html or ist_plan) and not metas:
            self.fund("WARNUNG", "Keine Meta-Description", "–",
                      "Meta-Description",
                      "120 bis 155 Zeichen: Nutzen, Beweis, nächster Schritt.")
        for m in metas:
            if len(m) > 160:
                self.fund("HINWEIS", "Meta-Description lang", "(%d Zeichen) %s"
                          % (len(m), self.ausschnitt(m)), "Meta-Description",
                          "Bis ca. 155 Zeichen, sonst wird gekürzt.")
            elif len(m) < 70:
                self.fund("HINWEIS", "Meta-Description kurz", "(%d Zeichen) %s"
                          % (len(m), m), "Meta-Description",
                          "120 bis 155 Zeichen nutzen.")
        if self.ort:
            ort = self.ort.lower()
            fehlt = []
            if titles and not any(ort in t.lower() for t in titles):
                fehlt.append("Title")
            h1 = [b.text for b in self.bloecke if b.art == "h1"]
            if h1 and not any(ort in t.lower() for t in h1):
                fehlt.append("H1")
            if metas and not any(ort in m.lower() for m in metas):
                fehlt.append("Meta-Description")
            if fehlt:
                self.fund("HINWEIS", "Ort fehlt", "'%s' fehlt in: %s" % (
                    self.ort, ", ".join(fehlt)), "SEO",
                    "Für lokale Suche gehört der Ort in Title und Meta, wenn "
                    "es natürlich passt, auch in die H1.")

    def pruefe_typografie(self):
        ausrufe = 0
        for b in self.texte(LESBARE | {"title", "meta", "link"}):
            self._akt = b
            ausrufe += b.text.count("!")
            for rx, stufe, regel, tipp in TYPOGRAFIE:
                for m in rx.finditer(b.text):
                    if regel == "Doppeltes Wort" and m.group(1).lower() in (
                            "die", "das", "der") and False:
                        continue
                    self.fund(stufe, regel, self.ausschnitt(
                        b.text, m.start(), m.end(), breite=25),
                        self.ort_name(b.art), tipp, schluessel=regel)
            ohne_klammern = re.sub(r"\[[^\]]*\]", " ", b.text)
            for w in re.findall(r"\b[A-ZÄÖÜ]{4,}\b", ohne_klammern):
                if w not in AKRONYME and w.upper() not in {a.upper() for a in AKRONYME}:
                    self.fund("HINWEIS", "Großbuchstaben", w,
                              self.ort_name(b.art),
                              "Wörter in Großbuchstaben wirken laut. Normal "
                              "schreiben (Abkürzungen ausgenommen).",
                              schluessel="caps")
        self._akt = None
        if ausrufe > 3:
            self.fund("HINWEIS", "Viele Ausrufezeichen", "%d auf der Seite" %
                      ausrufe, "Seite", "Ruhige Aussagen wirken seriöser.")
        # Gendern einheitlich?
        alles = " ".join(b.text for b in self.texte(LESBARE))
        stile = {
            "Sternchen": r"\w\*innen\b|\w\*in\b",
            "Doppelpunkt": r"\w:innen\b",
            "Unterstrich": r"\w_innen\b",
            "Binnen-I": r"\b[a-zäöüß]+Innen\b",
            "Schrägstrich": r"\w/-?innen\b",
            "Paarform": r"\b(\w{3,})innen und \1(?:e|en|er|n)?\b",
        }
        gefunden = [n for n, rx in stile.items() if re.search(rx, alles)]
        if len(gefunden) > 1:
            self.fund("HINWEIS", "Gendern uneinheitlich", ", ".join(gefunden),
                      "Seite", "Eine Form wählen, am einfachsten neutrale "
                      "Wörter (Kundschaft, Team, alle, die …).")
        # Dreier-Ketten
        dreier = re.findall(r"\b([a-zäöüß]{4,}), ([a-zäöüß]{4,}) und "
                            r"([a-zäöüß]{4,})\b", alles)
        if len(dreier) >= 3:
            self.fund("HINWEIS", "Viele Dreier-Aufzählungen", "; ".join(
                ", ".join(d) for d in dreier[:3]), "Seite",
                "'schnell, einfach und zuverlässig' ist ein KI-Muster. Lieber "
                "ein konkreter Punkt mit Beleg.")

    def ausfuehren(self):
        for pruefe in (self.pruefe_platzhalter, self.pruefe_anrede,
                       self.pruefe_seo, self.pruefe_ueberschriften,
                       self.pruefe_buttons_links, self.pruefe_bilder,
                       self.pruefe_formular, self.pruefe_lesbarkeit,
                       self.pruefe_saetze, self.pruefe_floskeln,
                       self.pruefe_recht_und_belege, self.pruefe_typografie):
            self._akt = None
            pruefe()
        self._akt = None
        w = sum(len(woerter(b.text)) for b in self.texte(LESBARE))
        self.kennzahlen["woerter_gesamt"] = w
        reihenfolge = {s: i for i, s in enumerate(STUFEN)}
        self.funde.sort(key=lambda f: reihenfolge[f["stufe"]])
        for f in self.funde:
            f.pop("_key", None)
        return self.funde


PARTIZIP = re.compile(
    r"\b(?:ge(?!ben\b|hen\b|lten\b|nießen\b|winnen\b|hören\b|stalten\b|"
    r"währen\b|nügen\b|fallen\b|lingen\b|schehen\b|stehen\b|brauchen\b)"
    r"[a-zäöüß]{3,}(?:t|en)|(?:an|auf|aus|ab|bei|ein|mit|nach|vor|zu|zurück|"
    r"weg|her|hin|los|fest|frei|statt|teil|um|durch|wieder|dar|vorbei)ge"
    r"[a-zäöüß]{2,}(?:t|en)|(?:be|ver|er|ent|zer|emp|miss)[a-zäöüß]{3,}t|"
    r"[a-zäöüß]{3,}iert)\b")

# ---------------------------------------------------------------------------
# Ausgabe
# ---------------------------------------------------------------------------


def zahl(x):
    return ("%.1f" % x).replace(".", ",") if isinstance(x, float) else str(x)


def bericht_text(name, pr, max_pro_regel):
    k = pr.kennzahlen
    zeilen = ["", "Texte-Prüfung: %s" % name, "=" * (15 + len(name))]
    teile = []
    if k.get("woerter_gesamt"):
        teile.append("Wörter: %d" % k["woerter_gesamt"])
    if k.get("saetze"):
        teile.append("Sätze (Fließtext): %d" % k["saetze"])
        teile.append("Ø Satzlänge: %s" % zahl(k["asl"]))
        teile.append("längster Satz: %d Wörter" % k["laengster"])
    if teile:
        zeilen.append("  " + " · ".join(teile))
    if "amstad" in k:
        zeilen.append("  Lesbarkeit: Flesch-Amstad %d (%s) · Wiener "
                      "Sachtextformel %s (Ziel: Amstad ab 60, WSTF bis 8)" % (
                          k["amstad"], amstad_stufe(k["amstad"]),
                          zahl(k["wstf"])))
    if pr.info.get("offen"):
        zeilen.append("  Offene Punkte im Textplan ([FEHLT …]): %d" %
                      pr.info["offen"])
    if "wir" in k:
        zeilen.append("  Kundenfokus: Sie/Ihr %d× · wir/uns %d× · Anrede: %s" % (
            k["kunde"], k["wir"],
            "Sie" if k.get("anrede_sie") and not k.get("anrede_du") else
            "du" if k.get("anrede_du") and not k.get("anrede_sie") else
            "gemischt" if k.get("anrede_du") and k.get("anrede_sie") else "–"))
    for stufe in STUFEN:
        liste = [f for f in pr.funde if f["stufe"] == stufe]
        if not liste:
            continue
        titel = {"FEHLER": "FEHLER (muss weg)", "WARNUNG": "WARNUNG (ändern)",
                 "HINWEIS": "HINWEIS (prüfen)",
                 "BELEG": "BELEG (Quelle vom Kunden?)"}[stufe]
        zeilen.append("")
        zeilen.append("%s – %d" % (titel, len(liste)))
        je_regel = {}
        for f in liste:
            r = f["regel"].split(":")[0] if stufe != "BELEG" else f["regel"]
            je_regel.setdefault(r, []).append(f)
        for regel, fs in je_regel.items():
            for f in fs[:max_pro_regel]:
                anz = " (%d×)" % f["anzahl"] if f["anzahl"] > 1 else ""
                wo = f["ort"]
                if f.get("abschnitt"):
                    a = f["abschnitt"]
                    wo += " bei „%s“" % (a if len(a) <= 32 else a[:30] + "…")
                zeilen.append("  [%s] %s: %s%s" % (f["regel"], wo,
                                                    f["text"], anz))
                zeilen.append("      → %s" % f["tipp"])
            if len(fs) > max_pro_regel:
                zeilen.append("  … und %d weitere [%s]" % (
                    len(fs) - max_pro_regel, regel))
    z = {s: sum(1 for f in pr.funde if f["stufe"] == s) for s in STUFEN}
    zeilen.append("")
    zeilen.append("Zusammenfassung: %d Fehler · %d Warnungen · %d Hinweise · "
                  "%d Belege prüfen" % (z["FEHLER"], z["WARNUNG"],
                                        z["HINWEIS"], z["BELEG"]))
    return "\n".join(zeilen)


def regeln_auflisten():
    print("Floskeln, KI-Klang, Füllwörter, Nominalstil, Fachjargon")
    print("=" * 60)
    for m, st, kat, tipp in FLOSKELN:
        print("[%s] %s\n    %s\n    → %s" % (st, kat, m, tipp))
    print("\nRecht")
    print("=" * 60)
    for m, st, kat, tipp in RECHT:
        print("[%s] %s\n    %s\n    → %s" % (st, kat, m, tipp))
    print("\nBelege (Quelle vom Kunden nötig)")
    print("=" * 60)
    for m, kat, tipp in BELEGE:
        print("[BELEG] %s\n    %s\n    → %s" % (kat, m, tipp))


# ---------------------------------------------------------------------------
# Selbsttest
# ---------------------------------------------------------------------------

def selbsttest():
    fehler = []

    def regeln(funde):
        return {f["regel"].split(":")[0] for f in funde}

    schlecht = """<!doctype html><html lang="de"><head><title>Home</title></head>
    <body><h1>Herzlich willkommen auf unserer Website!</h1>
    <p>In der heutigen schnelllebigen Zeit bieten wir Ihnen maßgeschneiderte
    Lösungen. Wir sind Ihr kompetenter Partner und die Nr. 1 in der Region.
    Du bekommst bei uns 2 Jahre Gewährleistung. Nur heute 20% Rabatt!!</p>
    <a class="btn" href="/kontakt">Mehr erfahren</a>
    <a href="/preise">hier</a><img src="team.jpg">
    <p>[FEHLT: Telefonnummer]</p></body></html>"""
    b, info = lies_html(schlecht)
    f = Pruefung(b, info).ausfuehren()
    r = regeln(f)
    erwartet = {"Platzhalter", "Sie und du gemischt", "Werbefloskel",
                "KI-Klang", "Recht", "Nichtssagender Button",
                "Nichtssagender Linktext", "Bild ohne alt",
                "Keine Meta-Description", "Prozent", "Satzzeichen"}
    for e in erwartet:
        if e not in r:
            fehler.append("schlecht.html: Regel fehlt: " + e)
    gut = """<!doctype html><html lang="de"><head>
    <title>Heizung und Bad in Gütersloh | Haustechnik Beispiel</title>
    <meta name="description" content="Wir reparieren Heizungen und bauen Bäder
    in Gütersloh um. Sie bekommen vorher ein schriftliches Angebot. Rufen Sie
    an oder schreiben Sie uns."></head><body>
    <h1>Heizung und Bad in Gütersloh</h1>
    <p>Ihre Heizung macht Geräusche oder bleibt kalt? Wir kommen vorbei und
    sagen Ihnen, was es kostet, bevor wir anfangen.</p>
    <a class="btn" href="tel:+495241000000">Notdienst anrufen</a>
    <img src="bad.webp" alt="Neues Bad mit bodengleicher Dusche"></body></html>"""
    b, info = lies_html(gut)
    f = Pruefung(b, info).ausfuehren()
    if any(x["stufe"] == "FEHLER" for x in f):
        fehler.append("gut.html: unerwarteter FEHLER: %s" % [
            x for x in f if x["stufe"] == "FEHLER"])
    if any(x["regel"].startswith(("Werbefloskel", "KI-Klang")) for x in f):
        fehler.append("gut.html: unerwartete Floskel: %s" % [
            x["regel"] for x in f if x["regel"].startswith(("Werbe", "KI"))])
    plan = """# Textplan: Startseite
## Abschnitt 1: Hero
H1: Heizung und Bad in Gütersloh
Unterzeile: Wir reparieren Heizungen und bauen Bäder um.
Button 1: Angebot anfordern
Bild: Foto vom Team
## Offene Fragen an den Kunden
- [FEHLT: Antwortzeit]
- Welche Marken?"""
    b, info = lies_markdown(plan)
    if not info.get("textplan"):
        fehler.append("textplan.md: nicht als Textplan erkannt")
    arten = [x.art for x in b]
    if arten.count("h1") != 1 or "button" not in arten:
        fehler.append("textplan.md: Felder falsch gelesen: %s" % arten)
    if any("FEHLT" in x.text for x in b):
        fehler.append("textplan.md: Abschnitt 'Offene Fragen' nicht übersprungen")
    b, info = lies_markdown("H1: Test\nH3: Bittet um Bewertungen\n"
                            "Text: Nach dem Auftrag geht die Bitte raus, "
                            "sobald Sie sie freigeben.\nButton: Termin buchen")
    f = Pruefung(b, info).ausfuehren()
    if any(x["regel"] in ("Doppeltes Wort", "Recht: Bewertungen") for x in f):
        fehler.append("Fehlalarm: %s" % [x["regel"] for x in f])
    s = saetze("Am 17. November kommen wir z. B. vorbei. Dann prüfen wir alles. "
               "Seit 2010. Fertig!")
    if len(s) != 4:
        fehler.append("Satztrennung: %d statt 4 Sätze: %s" % (len(s), s))
    for wort, soll in (("Automatisierung", 6), ("Information", 5),
                       ("Heizung", 2), ("Feuer", 2), ("beachten", 3)):
        if silben(wort) != soll:
            fehler.append("Silben %s: %d statt %d" % (wort, silben(wort), soll))
    if fehler:
        print("Selbsttest FEHLGESCHLAGEN:")
        for x in fehler:
            print("  - " + x)
        return 1
    print("Selbsttest bestanden.")
    return 0


# ---------------------------------------------------------------------------
# Hauptprogramm
# ---------------------------------------------------------------------------

def main(argv=None):
    p = argparse.ArgumentParser(
        prog="texte_pruefen.py",
        description="Prüft deutsche Website-Texte (HTML, Markdown-Textplan, "
                    "Text).")
    p.add_argument("dateien", nargs="*", help="Dateien oder - für stdin")
    p.add_argument("--anrede", choices=["sie", "du"],
                   help="erwartete Anrede")
    p.add_argument("--ort", help="Ort für lokale Suche, z. B. 'Gütersloh'")
    p.add_argument("--json", action="store_true", help="Ausgabe als JSON")
    p.add_argument("--max", type=int, default=6,
                   help="höchstens so viele Funde je Regel zeigen (Standard 6)")
    p.add_argument("--ohne", default="",
                   help="Stufen ausblenden, z. B. --ohne HINWEIS,BELEG")
    p.add_argument("--liste", action="store_true",
                   help="alle Regeln anzeigen")
    p.add_argument("--selbsttest", action="store_true",
                   help="eingebaute Tests ausführen")
    a = p.parse_args(argv)
    if a.liste:
        regeln_auflisten()
        return 0
    if a.selbsttest:
        return selbsttest()
    if not a.dateien:
        p.print_usage(sys.stderr)
        print("Fehler: Datei angeben (oder - für stdin).", file=sys.stderr)
        return 2
    ohne = {s.strip().upper() for s in a.ohne.split(",") if s.strip()}
    ergebnisse = []
    hat_fehler = False
    for pfad in a.dateien:
        try:
            if pfad == "-":
                inhalt = sys.stdin.read()
            else:
                inhalt = Path(pfad).read_text(encoding="utf-8", errors="replace")
        except OSError as e:
            print("Fehler: %s kann nicht gelesen werden (%s)." % (pfad, e),
                  file=sys.stderr)
            return 2
        bloecke, info = lies_datei(pfad, inhalt)
        pr = Pruefung(bloecke, info, anrede=a.anrede, ort=a.ort)
        pr.ausfuehren()
        pr.funde = [f for f in pr.funde if f["stufe"] not in ohne]
        if any(f["stufe"] == "FEHLER" for f in pr.funde):
            hat_fehler = True
        ergebnisse.append((pfad, pr))
    if a.json:
        print(json.dumps([{"datei": pfad, "kennzahlen": pr.kennzahlen,
                           "funde": pr.funde} for pfad, pr in ergebnisse],
                         ensure_ascii=False, indent=2))
    else:
        for pfad, pr in ergebnisse:
            print(bericht_text("stdin" if pfad == "-" else pfad, pr, a.max))
    return 1 if hat_fehler else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except BrokenPipeError:          # z. B. bei "| head"
        try:
            sys.stdout = open("/dev/null", "w")
        except OSError:
            pass
        sys.exit(0)
