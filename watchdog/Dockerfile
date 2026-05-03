# 경량: Docker CLI로 형제 컨테이너 로그 스트리밍 + Python 분석
FROM docker:27-cli

RUN apk add --no-cache python3

COPY watchdog.py /watchdog.py
RUN chmod +x /watchdog.py

ENTRYPOINT ["python3", "/watchdog.py"]
