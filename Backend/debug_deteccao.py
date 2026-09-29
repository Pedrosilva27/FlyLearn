"""
debug_deteccao.py — script de diagnostico (nao faz parte do projeto
final, e so para descobrir por que a folha nao esta sendo encontrada).

Como usar:
  1. Coloque a folha em frente a webcam, do jeito que voce tentaria
     normalmente (com os 4 quadrados pretos visiveis).
  2. Rode: python debug_deteccao.py
  3. Uma janela vai abrir mostrando a webcam. Posicione a folha e
     aperte a tecla ESPACO para tirar a foto (ou "q" para sair sem
     salvar).
  4. O script salva varios arquivos .png na mesma pasta e imprime no
     terminal a lista de "candidatos" que quase viraram marcador.
  5. Me manda os arquivos frame_original.png, binaria_otsu.png e o que
     apareceu impresso no terminal.
"""

import cv2
import numpy as np

from omr_config import (
    MARCADOR_AREA_MIN_FRAC,
    MARCADOR_AREA_MAX_FRAC,
    MARCADOR_ASPECTO_MIN,
    MARCADOR_ASPECTO_MAX,
    MARCADOR_EXTENT_MIN,
)


def encontrar_contornos(img_bin):
    resultado = cv2.findContours(img_bin, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if len(resultado) == 3:
        _, contornos, _ = resultado
    else:
        contornos, _ = resultado
    return contornos


def analisar(nome, binaria, area_imagem, frame_para_desenhar):
    contornos = encontrar_contornos(binaria)
    print(f"\n--- {nome}: {len(contornos)} contornos encontrados ---")

    candidatos_ok = 0
    vis = cv2.cvtColor(binaria, cv2.COLOR_GRAY2BGR)

    for c in contornos:
        area = cv2.contourArea(c)
        if area < 30:  # ignora ruido minusculo, nem printa
            continue

        x, y, w, h = cv2.boundingRect(c)
        if w == 0 or h == 0:
            continue
        aspecto = w / float(h)
        extent = area / float(w * h)

        area_frac = area / area_imagem
        passou_area = MARCADOR_AREA_MIN_FRAC <= area_frac <= MARCADOR_AREA_MAX_FRAC
        passou_aspecto = MARCADOR_ASPECTO_MIN <= aspecto <= MARCADOR_ASPECTO_MAX
        passou_extent = extent >= MARCADOR_EXTENT_MIN

        cor = (0, 255, 0) if (passou_area and passou_aspecto and passou_extent) else (0, 0, 255)
        cv2.rectangle(vis, (x, y), (x + w, y + h), cor, 2)
        cv2.rectangle(frame_para_desenhar, (x, y), (x + w, y + h), cor, 2)

        if area > 80:  # so printa os que tem alguma chance de ser relevante
            print(
                f"  bbox=({x},{y},{w},{h}) area={area:.0f} "
                f"area_frac={area_frac:.6f} aspecto={aspecto:.2f} extent={extent:.2f} "
                f"| area_ok={passou_area} aspecto_ok={passou_aspecto} extent_ok={passou_extent}"
            )
            if passou_area and passou_aspecto and passou_extent:
                candidatos_ok += 1

    print(f"  => {candidatos_ok} candidato(s) que passariam em TODOS os filtros")
    cv2.imwrite(f"{nome}.png", vis)


def main():
    video = cv2.VideoCapture(0)
    frame = None

    print("Posicione a folha e aperte ESPACO para capturar (ou 'q' para sair).")
    while True:
        ret, quadro = video.read()
        if not ret:
            continue
        cv2.imshow("Aperte ESPACO para capturar", quadro)
        tecla = cv2.waitKey(1) & 0xFF
        if tecla == ord(" "):
            frame = quadro.copy()
            break
        if tecla == ord("q"):
            video.release()
            cv2.destroyAllWindows()
            return

    video.release()
    cv2.destroyAllWindows()

    cv2.imwrite("frame_original.png", frame)

    altura_img, largura_img = frame.shape[:2]
    area_imagem = float(largura_img * altura_img)
    print(f"Tamanho do frame: {largura_img}x{altura_img}")

    cinza = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    cinza = cv2.GaussianBlur(cinza, (5, 5), 0)

    _, otsu = cv2.threshold(cinza, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    frame_marcado = frame.copy()
    analisar("binaria_otsu", otsu, area_imagem, frame_marcado)

    for limiar_fixo in (60, 80, 100):
        _, fixa = cv2.threshold(cinza, limiar_fixo, 255, cv2.THRESH_BINARY_INV)
        analisar(f"binaria_fixa_{limiar_fixo}", fixa, area_imagem, frame.copy())

    cv2.imwrite("frame_com_candidatos.png", frame_marcado)

    print(
        "\nArquivos salvos: frame_original.png, frame_com_candidatos.png, "
        "binaria_otsu.png, binaria_fixa_60.png, binaria_fixa_80.png, binaria_fixa_100.png"
    )
    print("Me manda esses arquivos + o que foi impresso acima.")


if __name__ == "__main__":
    main()
