from __future__ import annotations
from .base import SMSProvider


class ConsoleSMS(SMSProvider):
    async def send(self, to: str, body: str) -> bool:
        print(f"[SMS to {to}]: {body}")
        return True


class EmailGatewaySMS(SMSProvider):
    def __init__(self, smtp_host: str = "", smtp_port: int = 25):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port

    async def send(self, to: str, body: str) -> bool:
        if not self.smtp_host:
            print(f"[Email SMS to {to}]: {body} (SMTP not configured)")
            return True
        try:
            import smtplib
            from email.message import EmailMessage
            msg = EmailMessage()
            msg.set_content(body)
            msg["To"] = to
            msg["From"] = "noreply@smbvoice.local"
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.send_message(msg)
            return True
        except Exception as e:
            print(f"Email SMS error: {e}")
            return False
