"""Step 8 — export a trip's itinerary as a PDF or an .ics calendar file."""
import io
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.core.models import Trip
from app.itinerary.schemas import ItineraryOut

# ReportLab's built-in Helvetica can't draw "₹", so prefer a system Unicode font.
_FONT_CANDIDATES = [
    ("C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/segoeuib.ttf"),
    ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf"),
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ("/Library/Fonts/Arial Unicode.ttf", "/Library/Fonts/Arial Unicode.ttf"),
]
_font_names: tuple[str, str] | None = None


def _fonts() -> tuple[str, str]:
    global _font_names
    if _font_names is None:
        _font_names = ("Helvetica", "Helvetica-Bold")
        for regular, bold in _FONT_CANDIDATES:
            if Path(regular).exists() and Path(bold).exists():
                pdfmetrics.registerFont(TTFont("TripUnify", regular))
                pdfmetrics.registerFont(TTFont("TripUnify-Bold", bold))
                _font_names = ("TripUnify", "TripUnify-Bold")
                break
    return _font_names


def _text(value: str | None) -> str:
    value = value or ""
    if _fonts()[0] == "Helvetica":  # no Unicode font found on this machine
        value = value.replace("₹", "Rs.").replace("→", "->")
    return escape(value)


def build_pdf(trip: Trip, itinerary: ItineraryOut) -> bytes:
    regular, bold = _fonts()
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle("t", parent=base["Title"], fontName=bold, fontSize=22, spaceAfter=4),
        "sub": ParagraphStyle("s", parent=base["Normal"], fontName=regular, fontSize=11, textColor=colors.grey),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName=bold, fontSize=14, spaceBefore=10),
        "body": ParagraphStyle("b", parent=base["Normal"], fontName=regular, fontSize=9.5, leading=13),
        "small": ParagraphStyle("sm", parent=base["Normal"], fontName=regular, fontSize=8.5,
                                textColor=colors.grey, leading=11),
        "cell_bold": ParagraphStyle("cb", parent=base["Normal"], fontName=bold, fontSize=9.5, leading=12),
    }

    story = [
        Paragraph(_text(trip.name), styles["title"]),
        Paragraph(
            _text(f"{trip.destination}  ·  {trip.start_date} → {trip.end_date}  ·  "
                  f"Budget {trip.budget_min:g}–{trip.budget_max:g} per person"),
            styles["sub"],
        ),
        Paragraph(
            _text(f"Status: {itinerary.status.title()}  ·  Members: "
                  + ", ".join(m.user.name for m in trip.members)),
            styles["sub"],
        ),
        Spacer(1, 6 * mm),
    ]

    if itinerary.conflicts:
        story.append(Paragraph("Needs group input", styles["h2"]))
        for c in itinerary.conflicts:
            story.append(Paragraph(_text(f"• {' & '.join(c.members)}: {c.note}"), styles["body"]))

    if itinerary.stay_options:
        story.append(Paragraph("Where to stay (live listings)", styles["h2"]))
        for s in itinerary.stay_options:
            line = f"• <b>{_text(s.name)}</b> — {_text(s.price or 'price not listed')}"
            story.append(Paragraph(line, styles["body"]))
        story.append(Paragraph(_text(f"Source: {itinerary.stay_options[0].source_url}"), styles["small"]))

    for day in itinerary.days:
        story.append(Paragraph(_text(f"Day {day.day_number} — {day.date}"), styles["h2"]))
        if day.weather:
            story.append(Paragraph(_text(day.weather.summary), styles["small"]))
        story.append(Paragraph(_text(day.summary), styles["body"]))
        story.append(Spacer(1, 2 * mm))

        rows = [[Paragraph("Time", styles["cell_bold"]), Paragraph("Activity", styles["cell_bold"])]]
        for act in day.activities:
            details = f"<b>{_text(act.title)}</b> <font color='grey'>({_text(act.category)})</font><br/>"
            details += _text(act.description)
            if act.place_name:
                extra = act.place_name
                if act.place_rating is not None:
                    extra += f" · ★ {act.place_rating}"
                details += f"<br/><font color='grey'>{_text(extra)}</font>"
            rows.append([Paragraph(_text(act.time), styles["body"]), Paragraph(details, styles["body"])])

        table = Table(rows, colWidths=[20 * mm, 150 * mm])
        table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LINEBELOW", (0, 0), (-1, 0), 0.8, colors.HexColor("#4f46e5")),
            ("LINEBELOW", (0, 1), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(table)

    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    story += [Spacer(1, 8 * mm), Paragraph(_text(f"Generated by TripUnify · {generated}"), styles["small"])]

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=16 * mm, bottomMargin=16 * mm, title=trip.name)
    doc.build(story)
    return buffer.getvalue()


def _ics_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def _fold(line: str) -> str:
    # RFC 5545: lines longer than 75 octets are folded with CRLF + a single space.
    encoded = line.encode("utf-8")
    if len(encoded) <= 75:
        return line
    parts, current = [], b""
    for ch in line:
        b = ch.encode("utf-8")
        if len(current) + len(b) > 74:
            parts.append(current.decode("utf-8"))
            current = b""
        current += b
    parts.append(current.decode("utf-8"))
    return "\r\n ".join(parts)


def build_ics(trip: Trip, itinerary: ItineraryOut) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TripUnify//Itinerary Export//EN",
        "CALSCALE:GREGORIAN",
        f"X-WR-CALNAME:{_ics_escape(trip.name)}",
    ]
    for day in itinerary.days:
        day_date = date.fromisoformat(day.date)
        for i, act in enumerate(day.activities):
            match = re.match(r"^(\d{1,2}):(\d{2})", act.time.strip())
            lines += ["BEGIN:VEVENT", f"UID:{trip.id}-d{day.day_number}-a{i}@tripunify", f"DTSTAMP:{stamp}"]
            if match:
                start = datetime.combine(day_date, datetime.min.time()).replace(
                    hour=int(match.group(1)) % 24, minute=int(match.group(2))
                )
                end = start + timedelta(minutes=max(act.duration_minutes, 15))
                lines += [f"DTSTART:{start:%Y%m%dT%H%M%S}", f"DTEND:{end:%Y%m%dT%H%M%S}"]
            else:
                lines += [f"DTSTART;VALUE=DATE:{day_date:%Y%m%d}"]
            description = act.description
            if act.place_name:
                description += f"\nPlace: {act.place_name}"
            lines += [
                f"SUMMARY:{_ics_escape(act.title)}",
                f"DESCRIPTION:{_ics_escape(description)}",
                f"LOCATION:{_ics_escape(act.place_name or act.place_query or trip.destination)}",
                "END:VEVENT",
            ]
    lines.append("END:VCALENDAR")
    return "\r\n".join(_fold(line) for line in lines) + "\r\n"
