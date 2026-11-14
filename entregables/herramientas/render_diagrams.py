# -*- coding: utf-8 -*-
"""
Generador SVG para los diagramas UML de entregables/ (INF-3290).
Sin dependencias externas: emite SVG 1.1 directamente.
Uso: python render_diagrams.py
Fuente editable de cada diagrama: los .mmd hermanos (Mermaid).
"""
import html
import math
import os

OUT = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(OUT)
SEQ_DIR = os.path.join(ROOT, '06-Diagramas-Secuencia')
ACT_DIR = os.path.join(ROOT, '09-Diagramas-Actividad')

# ---------------------------------------------------------------- helpers

def esc(s):
    return html.escape(str(s), quote=True)

def wrap(text, width=34):
    """Wrap label into <=2 lines."""
    words = str(text).split()
    lines, cur = [], ''
    for w in words:
        if len(cur) + len(w) + 1 <= width:
            cur = (cur + ' ' + w).strip()
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines[:3]

def text_lines(x, y, lines, size=11, anchor='middle', color='#1a2332', weight='normal'):
    out = []
    lh = size + 3
    total = (len(lines) - 1) * lh
    for i, ln in enumerate(lines):
        out.append(
            f'<text x="{x}" y="{y - total/2 + i*lh}" font-size="{size}" '
            f'text-anchor="{anchor}" fill="{color}" font-weight="{weight}" '
            f'font-family="Segoe UI, Arial, sans-serif">{esc(ln)}</text>'
        )
    return '\n'.join(out)

def label_bg(cx, cy, lines, size=11):
    w = max(len(l) for l in lines) * size * 0.58 + 8
    h = len(lines) * (size + 3) + 4
    return (f'<rect x="{cx-w/2:.1f}" y="{cy-h/2:.1f}" width="{w:.1f}" height="{h:.1f}" '
            f'fill="#ffffff" fill-opacity="0.85"/>')

# ---------------------------------------------------------------- sequence

def render_sequence(spec, path):
    parts = spec['participants']
    n = len(parts)
    W = max(980, 90 + n * 150)
    margin = 70
    spacing = (W - 2 * margin) / max(n - 1, 1)
    xs = [margin + i * spacing for i in range(n)]
    PW, PH = 132, 42
    top = 18
    lifetop = top + PH + 14
    row_h = 46
    # collect events: ('msg', f, t, label, dashed) | ('self', i, label) | ('note', label) | ('frame', kind, label, start, end)
    events = spec['events']
    msg_rows = [e for e in events if e[0] in ('msg', 'self')]
    nrows = len(msg_rows)
    bottom = lifetop + nrows * row_h + 30
    H = bottom + 10

    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
           f'viewBox="0 0 {W} {H}" font-family="Segoe UI, Arial, sans-serif">',
           '<defs>',
           '<marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" '
           'markerHeight="7" orient="auto-start-reverse">'
           '<path d="M0,0 L10,5 L0,10 z" fill="#33415c"/></marker>',
           '</defs>',
           '<rect width="100%" height="100%" fill="#ffffff"/>']

    # participant boxes
    for i, name in enumerate(parts):
        x = xs[i] - PW / 2
        svg.append(f'<rect x="{x:.1f}" y="{top}" width="{PW}" height="{PH}" rx="8" '
                   f'fill="#0f2740"/>')
        svg.append(text_lines(xs[i], top + PH / 2 + 4, wrap(name, 22), 12, color='#ffffff', weight='600'))
        svg.append(f'<line x1="{xs[i]:.1f}" y1="{lifetop}" x2="{xs[i]:.1f}" y2="{bottom - 8}" '
                   f'stroke="#9fb0c6" stroke-width="1.2" stroke-dasharray="5 4"/>')

    # map event index -> row y; msg/self events get sequential ordinals
    row_of = {}
    ordinal_of = {}
    r = 0
    for idx, e in enumerate(events):
        if e[0] in ('msg', 'self'):
            row_of[idx] = lifetop + 18 + r * row_h
            ordinal_of[idx] = r
            r += 1
    # ordinal -> event index
    ev_by_ord = {v: k for k, v in ordinal_of.items()}

    # frames first (behind messages); i0/i1 are MESSAGE ordinals
    for e in events:
        if e[0] == 'frame':
            _, kind, label, i0, i1 = e
            rows = [row_of[ev_by_ord[o]] for o in range(i0, i1 + 1) if o in ev_by_ord]
            if not rows:
                continue
            y0, y1 = min(rows) - 16, max(rows) + 14
            cols = []
            for o in range(i0, i1 + 1):
                ev = events[ev_by_ord[o]]
                if ev[0] == 'msg':
                    cols += [ev[1], ev[2]]
                elif ev[0] == 'self':
                    cols.append(ev[1])
            if not cols:
                continue
            x0 = min(xs[c] for c in cols) - 78
            x1 = max(xs[c] for c in cols) + 78
            color = '#7a5af5' if kind in ('alt', 'opt') else '#3b82f6'
            svg.append(f'<rect x="{x0:.1f}" y="{y0:.1f}" width="{x1-x0:.1f}" height="{y1-y0:.1f}" '
                       f'fill="none" stroke="{color}" stroke-width="1.4" stroke-dasharray="6 4"/>')
            svg.append(f'<rect x="{x0+6:.1f}" y="{y0-1:.1f}" width="{min(len(label)*7+14, x1-x0-12):.1f}" '
                       f'height="17" fill="{color}"/>')
            svg.append(f'<text x="{x0+13:.1f}" y="{y0+11:.1f}" font-size="10.5" fill="#ffffff" '
                       f'font-weight="600">{esc(label)}</text>')

    # messages
    for idx, e in enumerate(events):
        if e[0] == 'msg':
            _, f, t, label, dashed = e
            y = row_of[idx]
            x1, x2 = xs[f], xs[t]
            direction = 1 if x2 > x1 else -1
            # shorten arrow to box edge (PW/2)
            ax1 = x1 + direction * (PW / 2 + 2)
            ax2 = x2 - direction * (PW / 2 + 2)
            dash = ' stroke-dasharray="6 4"' if dashed else ''
            svg.append(f'<line x1="{ax1:.1f}" y1="{y}" x2="{ax2:.1f}" y2="{y}" '
                       f'stroke="#33415c" stroke-width="1.5"{dash} marker-end="url(#arr)"/>')
            lines = wrap(label, 40)
            svg.append(label_bg((ax1 + ax2) / 2, y - 13, lines, 10.5))
            svg.append(text_lines((ax1 + ax2) / 2, y - 12, lines, 10.5))
        elif e[0] == 'self':
            _, i, label = e
            y = row_of[idx]
            x = xs[i]
            svg.append(f'<path d="M{x+PW/2:.1f},{y-9} h22 v14 h-22" fill="none" '
                       f'stroke="#33415c" stroke-width="1.5" marker-end="url(#arr)"/>')
            svg.append(text_lines(x + PW / 2 + 34, y - 2, wrap(label, 26), 10, anchor='start'))
        elif e[0] == 'note':
            _, label = e
            y = lifetop + 10 + sum(1 for j in range(idx) if events[j][0] == 'note') * 0
            # place note at its own pseudo-row after last message row used so far
            pass

    # notes: render below messages area, one per line
    notes = [e[1] for e in events if e[0] == 'note']
    if notes:
        ny = lifetop + nrows * row_h + 12
        for i, label in enumerate(notes):
            svg.append(f'<rect x="{margin}" y="{ny + i*22 - 13}" width="{W-2*margin}" '
                       f'height="20" fill="#fff7e0" stroke="#e3c56b" rx="4"/>')
            svg.append(text_lines(W / 2, ny + i*22 - 3, wrap(label, 90), 11, color='#6b5310'))
        H = ny + len(notes) * 22 + 14
        svg[0] = svg[0].replace(f'height="{bottom + 10}"', f'height="{H}"')

    svg.append('</svg>')
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(svg))

# ---------------------------------------------------------------- activity

ACT_W, ACT_H = 200, 48
DEC_W, DEC_H = 190, 70

def render_activity(spec, path):
    nodes = {n['id']: n for n in spec['nodes']}
    # layer -> ordered ids
    layers = {}
    for n in spec['nodes']:
        layers.setdefault(n['layer'], []).append(n['id'])
    row_h = spec.get('row_h', 96)
    slot_w = spec.get('slot_w', 240)
    x0 = spec.get('x0', 60)
    y0 = spec.get('y0', 40)

    def center(nid):
        n = nodes[nid]
        li = n['layer']
        order = layers[li].index(nid)
        x = x0 + order * slot_w + slot_w / 2
        y = y0 + li * row_h
        return x, y

    # canvas size
    maxlayer = max(layers)
    maxslot = max(len(v) for v in layers.values())
    W = x0 * 2 + maxslot * slot_w
    H = y0 * 2 + (maxlayer + 1) * row_h

    def dims(n):
        if n['type'] in ('start', 'end'):
            return 22, 22
        if n['type'] == 'decision':
            return DEC_W, DEC_H
        return ACT_W, ACT_H

    def clip(x1, y1, x2, y2, w1, h1, w2, h2):
        dx, dy = x2 - x1, y2 - y1
        if dx == 0 and dy == 0:
            return x1, y1, x2, y2
        tx = (w1 / 2) / abs(dx) if dx else 1e9
        ty = (h1 / 2) / abs(dy) if dy else 1e9
        t = min(tx, ty, 1.0)
        sx, sy = x1 + dx * t, y1 + dy * t
        dx2, dy2 = x1 - x2, y1 - y2
        tx2 = (w2 / 2) / abs(dx2) if dx2 else 1e9
        ty2 = (h2 / 2) / abs(dy2) if dy2 else 1e9
        t2 = min(tx2, ty2, 1.0)
        ex, ey = x2 + dx2 * t2, y2 + dy2 * t2
        return sx, sy, ex, ey

    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
           f'viewBox="0 0 {W} {H}" font-family="Segoe UI, Arial, sans-serif">',
           '<defs><marker id="arrA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" '
           'markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#33415c"/></marker></defs>',
           '<rect width="100%" height="100%" fill="#ffffff"/>']

    # edges
    for e in spec['edges']:
        a, b = nodes[e['a']], nodes[e['b']]
        x1, y1 = center(e['a'])
        x2, y2 = center(e['b'])
        w1, h1 = dims(a)
        w2, h2 = dims(b)
        sx, sy, ex, ey = clip(x1, y1, x2, y2, w1, h1, w2, h2)
        svg.append(f'<line x1="{sx:.1f}" y1="{sy:.1f}" x2="{ex:.1f}" y2="{ey:.1f}" '
                   f'stroke="#33415c" stroke-width="1.5" marker-end="url(#arrA)"/>')
        if e.get('label'):
            mx, my = (sx + ex) / 2, (sy + ey) / 2
            lines = wrap(e['label'], 30)
            svg.append(label_bg(mx, my - 8, lines, 10))
            svg.append(text_lines(mx, my - 7, lines, 10, color='#33415c'))

    # nodes
    for nid, n in nodes.items():
        x, y = center(nid)
        t = n['type']
        if t == 'start':
            svg.append(f'<circle cx="{x}" cy="{y}" r="11" fill="#0f2740"/>')
        elif t == 'end':
            svg.append(f'<circle cx="{x}" cy="{y}" r="12" fill="none" stroke="#0f2740" stroke-width="3"/>')
            svg.append(f'<circle cx="{x}" cy="{y}" r="7" fill="#0f2740"/>')
        elif t == 'decision':
            svg.append(f'<polygon points="{x},{y-DEC_H/2} {x+DEC_W/2},{y} {x},{y+DEC_H/2} '
                       f'{x-DEC_W/2},{y}" fill="#fff4e0" stroke="#b97d10" stroke-width="1.6"/>')
            svg.append(text_lines(x, y + 4, wrap(n['label'], 24), 11, color='#5c3d05'))
        else:
            w, h = ACT_W, ACT_H
            svg.append(f'<rect x="{x-w/2:.1f}" y="{y-h/2:.1f}" width="{w}" height="{h}" rx="10" '
                       f'fill="#eaf1fb" stroke="#3b6ea5" stroke-width="1.5"/>')
            svg.append(text_lines(x, y + 4, wrap(n['label'], 30), 11.5))

    svg.append('</svg>')
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(svg))

# ---------------------------------------------------------------- specs

def M(f, t, label, dashed=False):
    return ('msg', f, t, label, dashed)

def S(i, label):
    return ('self', i, label)

def N(label):
    return ('note', label)

def F(kind, label, i0, i1):
    return ('frame', kind, label, i0, i1)

def A(id, label, layer, type='action'):
    return {'id': id, 'label': label, 'layer': layer, 'type': type}

def E(a, b, label=None):
    return {'a': a, 'b': b, 'label': label}

SEQUENCES = {
    'sec-01-cu04-reservar-vuelo': {
        'participants': ['Cliente', '/buscar', 'Catálogo', '/reservar',
                         'BookingProvider', 'Asientos', 'Millas', 'Correo'],
        'events': [
            M(0, 1, 'criterios (origen, destino, fechas, pasajeros)'),
            M(1, 2, 'searchFlights(criteria, flightUpdates)'),
            M(2, 1, 'ocurrencias con horario vigente por fecha', True),
            M(0, 1, 'selecciona ida y regreso'),
            M(1, 3, 'navega con SearchSelection (router state)'),
            M(3, 4, 'isValidSearchSelection + validatePurchase(flightUpdates)'),
            F('alt', 'Selección inválida u obsoleta', 6, 7),
            M(4, 3, 'error «información del vuelo cambió»', True),
            M(3, 0, 'solicitar nueva búsqueda', True),
            F('else', 'Selección válida', 8, 22),
            M(0, 3, 'asigna asientos ida y vuelta'),
            M(0, 3, 'confirma (asientos + millas opcionales)'),
            M(3, 4, 'confirmPurchase(selection, seats, milesUsed)'),
            S(4, 'applyDueAccrual (millas pendientes)'),
            M(4, 5, 'validateSeatAvailability(vuelo|fecha, asiento)'),
            F('alt', 'Asiento ocupado o capacidad insuficiente', 13, 14),
            M(5, 4, 'error', True),
            M(4, 3, 'error — no se crea nada', True),
            F('else', 'Asientos disponibles', 15, 22),
            M(4, 6, 'validateRedemptionMiles(saldo, milesUsed)'),
            F('alt', 'Millas inválidas o excedidas', 16, 17),
            M(6, 4, 'error', True),
            M(4, 3, 'error — no se crea nada', True),
            F('else', 'Todo válido', 18, 22),
            S(4, 'buildPurchase + commit atómico'),
            M(4, 3, 'Purchase CN-XXXX', True),
            M(3, 0, 'navega a /confirmacion'),
            M(3, 7, 'sendConfirmationEmail(code)'),
            M(7, 0, 'PENDING → SENT / FAILED', True),
        ],
    },
    'sec-02-cu06-cancelar-reservacion': {
        'participants': ['Cliente', '/panel/reservas', '/panel/reservas/:code',
                         'BookingProvider', 'applyPurchaseCancellation',
                         'Asientos', 'Millas'],
        'events': [
            M(0, 1, 'consulta sus reservaciones'),
            M(1, 3, 'purchases del cliente activo'),
            M(3, 1, 'lista filtrada por customerEmail', True),
            M(0, 2, 'abre reserva CN-XXXX'),
            M(2, 3, 'purchaseLegs + elegibilidad + plazo (flightUpdates)'),
            M(3, 2, 'itinerario con horario vigente + 168 h', True),
            M(0, 2, 'solicita cancelación'),
            M(2, 3, 'cancelPurchase(code)'),
            M(3, 4, 'applyPurchaseCancellation(purchases, email, code, now, updates)'),
            S(4, 'verifica titularidad y status confirmada'),
            F('alt', 'No propia / ya cancelada / inexistente', 10, 10),
            M(4, 3, 'error — sin cambios', True),
            F('else', 'Válida', 11, 16),
            S(4, 'resuelve 1er vuelo; elegibilidad ≤ salida−168 h'),
            F('alt', 'Fuera de plazo (> 168 h)', 12, 12),
            M(4, 3, 'error «no procede la cancelación»', True),
            F('else', 'Dentro de plazo', 13, 16),
            S(4, 'refundAmount = 80 % neto; Purchase cancelada'),
            M(4, 3, 'purchases actualizadas (commit atómico)', True),
            N('Asientos liberados implícitamente (ocupación = solo confirmadas).'),
            N('Millas sin reversión: canjeadas no vuelven, acreditadas no se revierten (D-5).'),
            M(3, 2, 'resultado ok', True),
            M(2, 0, 'cancelada + reembolso mostrado', True),
        ],
    },
    'sec-03-cu07-actualizar-vuelo': {
        'participants': ['Agente', '/agente', 'BookingProvider',
                         'applyFlightUpdate', 'Catálogo', 'flightUpdates',
                         'Consumidores'],
        'events': [
            M(0, 1, 'selecciona número de vuelo'),
            M(1, 4, 'SCHEDULED_SERVICES.find(flightNumber)'),
            M(4, 1, 'servicio base + datos protegidos', True),
            M(1, 2, 'flightUpdates actuales'),
            M(2, 1, 'currentScheduleFieldsForService', True),
            M(1, 0, 'información actual (solo lectura protegidos)', True),
            M(0, 1, 'edita departureLocal y/o durationMinutes'),
            M(0, 1, '«Guardar cambios»'),
            M(1, 2, 'updateFlightService(flightNumber, changes)'),
            M(2, 3, 'applyFlightUpdate(updates, fn, changes, now)'),
            M(3, 4, 'verifica que el vuelo existe'),
            F('alt', 'Inválido / sin cambios / fallo', 11, 13),
            M(3, 2, 'error — sin commit', True),
            M(2, 1, 'mensaje de error', True),
            M(1, 0, 'error visible; estado intacto', True),
            F('else', 'Cambios válidos', 14, 19),
            S(3, 'effectiveAtMs = max(now, versión previa)'),
            M(3, 2, 'nuevo FlightUpdates (inmutable)', True),
            M(2, 5, 'commit({...store, flightUpdates})'),
            M(5, 2, 'storeRef + useState sincronizados', True),
            M(2, 1, 'ok', True),
            M(1, 0, '«actualizada» + valores refrescados', True),
            M(6, 5, 'scheduledServiceForDate / serviceForDate'),
            M(5, 6, 'horario vigente solo si la salida aún no ocurrió', True),
            N('Consumidores resuelven por fecha: búsqueda, reserva, reservas, cancelación, correo, landing.'),
            N('Versión aplica solo si la salida vigente de la ocurrencia es posterior a effectiveAtMs.'),
        ],
    },
}

ACTIVITIES = {
    'act-01-cu01-consultar-vuelo': {
        'nodes': [
            A('s', '', 0, 'start'),
            A('b', 'Accede a la landing /', 1),
            A('c', 'Presenta catálogo público de conexiones', 2),
            A('d', '¿Hay información de vuelos?', 3, 'decision'),
            A('e', 'Muestra tarjetas: tarifa, días y próximas salidas vigentes', 4),
            A('f', 'Informa que no hay información disponible', 4),
            A('g', '', 5, 'end'),
        ],
        'edges': [
            E('s', 'b'), E('b', 'c'), E('c', 'd'),
            E('d', 'e', 'Sí'), E('d', 'f', 'No'),
            E('e', 'g'), E('f', 'g'),
        ],
    },
    'act-02-cu02-registrar-cliente': {
        'nodes': [
            A('s', '', 0, 'start'),
            A('b', 'Selecciona Registrar cliente en /ingresar', 1),
            A('c', 'Muestra formulario: nombre, correo, tipo (+ compañía si corporativo)', 2),
            A('d', 'Envía el formulario', 3),
            A('e', '¿Datos completos y correo único?', 4, 'decision'),
            A('f', 'Señala datos faltantes; solicita completarlos', 5),
            A('g', 'Informa correo ya registrado; permite corregir', 5),
            A('h', '¿Clasificación?', 6, 'decision'),
            A('i', 'Registra cliente Corporativo', 7),
            A('j', 'Registra cliente Minorista', 7),
            A('k', 'Cliente registrado, 0 millas, sesión simulada', 8),
            A('z', '', 9, 'end'),
        ],
        'edges': [
            E('s', 'b'), E('b', 'c'), E('c', 'd'), E('d', 'e'),
            E('e', 'f', 'Faltan datos'), E('f', 'd'),
            E('e', 'g', 'Correo repetido'), E('g', 'd'),
            E('e', 'h', 'Válido'),
            E('h', 'i', 'Corporativo'), E('h', 'j', 'Minorista'),
            E('i', 'k'), E('j', 'k'), E('k', 'z'),
        ],
    },
    'act-03-cu03-buscar-vuelos': {
        'nodes': [
            A('s', '', 0, 'start'),
            A('b', 'Cliente con sesión abre /buscar e ingresa criterios', 1),
            A('c', '¿Criterios válidos? (30 días, orden, ≤30 pasajeros)', 2, 'decision'),
            A('d', 'Mensaje de error; corregir criterios', 3),
            A('e', 'searchFlights: ocurrencias operativas con horario vigente', 4),
            A('f', '¿Hay vuelos de ida y regreso?', 5, 'decision'),
            A('g', 'Mensaje sin vuelos + sugerencias de fechas', 6),
            A('h', 'Cliente selecciona ida y regreso', 7),
            A('i', '¿Plazas suficientes para el grupo?', 8, 'decision'),
            A('j', 'Aviso de capacidad; cambiar selección', 9),
            A('k', 'Continuar: navega a /reservar con la selección', 10),
            A('z', '', 11, 'end'),
        ],
        'edges': [
            E('s', 'b'), E('b', 'c'),
            E('c', 'd', 'No'), E('d', 'b'),
            E('c', 'e', 'Sí'), E('e', 'f'),
            E('f', 'g', 'No'), E('g', 'z'),
            E('f', 'h', 'Sí'), E('h', 'i'),
            E('i', 'j', 'No'), E('j', 'h'),
            E('i', 'k', 'Sí'), E('k', 'z'),
        ],
        'row_h': 90, 'slot_w': 260,
    },
    'act-04-cu04-reservar-vuelo': {
        'nodes': [
            A('s', '', 0, 'start'),
            A('b', 'Llega a /reservar con selección de CU-03', 1),
            A('c', '¿Sesión de cliente activa?', 2, 'decision'),
            A('d', 'Aviso «necesitas una cuenta» + acceso a registro/ingreso', 3),
            A('e', '¿Selección válida y vigente?', 4, 'decision'),
            A('f', '«La información del vuelo cambió»; nueva búsqueda', 5),
            A('g', 'Asigna un asiento por pasajero en ida y vuelta', 6),
            A('h', '¿Asientos válidos y disponibles?', 7, 'decision'),
            A('i', 'Error de asiento; corregir selección', 8),
            A('j', 'Revisa resumen: itinerario, pasajeros, total', 9),
            A('k', '¿Corporativo y canjea millas?', 10, 'decision'),
            A('l', '¿Millas válidas? (1.000, saldo, importe)', 11, 'decision'),
            A('m', 'Error de millas; ajustar o continuar sin canje', 12),
            A('n', 'Aplica descuento RD$ = millas / 10', 13),
            A('o', 'confirmPurchase: validación atómica', 14),
            A('p', '¿Todo válido?', 15, 'decision'),
            A('q', 'Error; no se crea compra ni se ocupa nada', 16),
            A('r', 'Commit: Purchase CN-XXXX + millas descontadas', 17),
            A('t', 'Navega a /confirmacion; correo simulado CU-05', 18),
            A('z', '', 19, 'end'),
        ],
        'edges': [
            E('s', 'b'), E('b', 'c'),
            E('c', 'd', 'No'), E('d', 'z'),
            E('c', 'e', 'Sí'),
            E('e', 'f', 'No'), E('f', 'z'),
            E('e', 'g', 'Sí'), E('g', 'h'),
            E('h', 'i', 'No'), E('i', 'g'),
            E('h', 'j', 'Sí'), E('j', 'k'),
            E('k', 'l', 'Sí'), E('k', 'n', 'No'), E('n', 'o'),
            E('l', 'm', 'No'), E('m', 'j'),
            E('l', 'n', 'Sí'),
            E('n', 'o'), E('o', 'p'),
            E('p', 'q', 'No'), E('q', 'z'),
            E('p', 'r', 'Sí'), E('r', 't'), E('t', 'z'),
        ],
        'row_h': 92, 'slot_w': 270,
    },
    'act-05-cu05-correo-confirmacion': {
        'nodes': [
            A('s', '', 0, 'start'),
            A('b', 'Compra confirmada en /confirmacion', 1),
            A('c', '¿Ya existe estado de correo?', 2, 'decision'),
            A('d', 'No-op: envío idempotente', 3),
            A('e', 'Genera contenido y lo congela (instantánea)', 4),
            A('f', 'Commit: PENDING + confirmationEmailContent', 5),
            A('g', 'Retardo simulado 400 ms', 6),
            A('h', '¿Resultado simulado?', 7, 'decision'),
            A('i', 'FAILED: alerta ámbar; reserva sigue confirmada', 8),
            A('j', 'SENT: «Confirmación enviada correctamente»', 8),
            A('z', '', 9, 'end'),
        ],
        'edges': [
            E('s', 'b'), E('b', 'c'),
            E('c', 'd', 'Sí'), E('d', 'z'),
            E('c', 'e', 'No'), E('e', 'f'), E('f', 'g'), E('g', 'h'),
            E('h', 'i', 'correo-fallido@'), E('h', 'j', 'resto'),
            E('i', 'z'), E('j', 'z'),
        ],
        'row_h': 96, 'slot_w': 300,
    },
    'act-06-cu06-cancelar-reservacion': {
        'nodes': [
            A('s', '', 0, 'start'),
            A('b', 'Cliente abre /panel/reservas/:code', 1),
            A('c', '¿Reserva propia y confirmada?', 2, 'decision'),
            A('d', 'No puede cancelarla; sin cambios', 3),
            A('e', 'Resuelve 1er vuelo; plazo 168 h inclusivo (hora local origen)', 4),
            A('f', '¿Solicitud dentro de las 168 h?', 5, 'decision'),
            A('g', '«No procede la devolución del 80 %»; sin cambios', 6),
            A('h', 'applyPurchaseCancellation: commit atómico', 7),
            A('i', 'Estado cancelada + cancelledAtMs + 80 % neto', 8),
            A('j', 'Asientos liberados; millas sin reversión', 9),
            A('k', 'Reserva conservada en el historial', 10),
            A('z', '', 11, 'end'),
        ],
        'edges': [
            E('s', 'b'), E('b', 'c'),
            E('c', 'd', 'No'), E('d', 'z'),
            E('c', 'e', 'Sí'), E('e', 'f'),
            E('f', 'g', 'No'), E('g', 'z'),
            E('f', 'h', 'Sí'), E('h', 'i'), E('i', 'j'), E('j', 'k'), E('k', 'z'),
        ],
        'row_h': 92, 'slot_w': 280,
    },
    'act-07-cu07-actualizar-vuelo': {
        'nodes': [
            A('s', '', 0, 'start'),
            A('b', 'Agente abre /agente y selecciona un número de vuelo', 1),
            A('c', 'Muestra datos protegidos y horario vigente', 2),
            A('d', 'Agente edita hora de salida y/o duración', 3),
            A('e', '¿Cambios presentes?', 4, 'decision'),
            A('f', '«No hay cambios que guardar»', 5),
            A('g', '¿Datos válidos? HH:mm y duración entera > 0', 6, 'decision'),
            A('h', 'Mensaje de validación; sin actualización', 7),
            A('i', 'applyFlightUpdate: nueva versión con effectiveAtMs', 8),
            A('j', '¿Transición ok?', 9, 'decision'),
            A('k', '«No se pudo completar la actualización»; estado intacto', 10),
            A('l', 'Commit: flightUpdates en memoria', 11),
            A('m', 'Horario vigente en búsqueda, reservas, correos y landing', 12),
            A('n', 'Ocurrencias ya salidas conservan horario histórico', 13),
            A('z', '', 14, 'end'),
        ],
        'edges': [
            E('s', 'b'), E('b', 'c'), E('c', 'd'), E('d', 'e'),
            E('e', 'f', 'No'), E('f', 'z'),
            E('e', 'g', 'Sí'),
            E('g', 'h', 'No'), E('h', 'd'),
            E('g', 'i', 'Sí'), E('i', 'j'),
            E('j', 'k', 'No'), E('k', 'z'),
            E('j', 'l', 'Sí'), E('l', 'm'), E('m', 'n'), E('n', 'z'),
        ],
        'row_h': 88, 'slot_w': 300,
    },
}


def main():
    for name, spec in SEQUENCES.items():
        render_sequence(spec, os.path.join(SEQ_DIR, name + '.svg'))
        print('svg:', name)
    for name, spec in ACTIVITIES.items():
        render_activity(spec, os.path.join(ACT_DIR, name + '.svg'))
        print('svg:', name)


if __name__ == '__main__':
    main()
