import cv2

video = cv2.VideoCapture(0)

if not video.isOpened():
    print("ERRO: não foi possível abrir a webcam")
    exit()

print("Webcam aberta!")

while True:
    ret, imagem = video.read()

    if not ret:
        print("ERRO: não conseguiu capturar a imagem")
        break

    cv2.imshow("TESTE WEBCAM", imagem)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

video.release()
cv2.destroyAllWindows()