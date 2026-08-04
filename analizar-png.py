from PIL import Image
import sys

img = Image.open('repro-owner-todas.png').convert('RGB')
W, H = img.size
px = img.load()
print('Tamaño:', W, 'x', H)

# 1) Detectar filas con líneas horizontales largas (bordes de tarjeta / separadores)
# Una línea horizontal = fila donde muchos píxeles cambian de color respecto a la fila anterior
filas_borde = []
for y in range(1, H - 1):
    cambios = 0
    for x in range(10, W - 10, 4):
        c1 = px[x, y - 1]
        c2 = px[x, y]
        if abs(c1[0] - c2[0]) + abs(c1[1] - c2[1]) + abs(c1[2] - c2[2]) > 60:
            cambios += 1
    if cambios > (W - 20) // 4 * 0.4:
        filas_borde.append(y)

# Agrupar filas consecutivas
grupos = []
if filas_borde:
    inicio = filas_borde[0]
    prev = filas_borde[0]
    for y in filas_borde[1:]:
        if y - prev <= 3:
            prev = y
        else:
            grupos.append((inicio, prev))
            inicio = y
            prev = y
    grupos.append((inicio, prev))
print('Líneas horizontales fuertes (y):')
for g in grupos:
    print('  fila', g[0], '-', g[1])

# 2) Comprobar si en las "separaciones" entre tarjetas hay contenido (sangrado)
# Posiciones de bloques medidas por DOM (coordenadas viewport = imagen):
bloques = [(390, 506), (528, 625), (647, 745), (767, 865), (887, 984)]
print('\nAnálisis de separaciones entre bloques:')
for i in range(len(bloques) - 1):
    y0 = bloques[i][1]      # bottom del bloque i
    y1 = bloques[i + 1][0]  # top del bloque i+1
    medio = (y0 + y1) // 2
    # Color de los píxeles del centro de la separación (columna x=200)
    c = px[200, medio]
    # Conteo de píxeles "no uniformes" en la franja: varianza de color
    muestras = [px[x, medio] for x in range(30, W - 30, 6)]
    unicos = len(set(muestras))
    print(f'  Bloque {i}->{i+1}: separación y={y0}..{y1}, centro y={medio}, color={c}, colores distintos={unicos}')

# 3) Identificar los colores de fondo principales de la página y tarjetas
from collections import Counter
cont = Counter()
for y in range(0, H, 3):
    for x in range(0, W, 3):
        cont[px[x, y]] += 1
print('\nColores más frecuentes (fondo):')
for color, n in cont.most_common(6):
    print('  ', color, n)
