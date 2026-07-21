#só uma ponte que importa funções reais do trello e deixa disponível para o scheduler
from app.services.trello import (
    check_and_create_trello_cards,
    watchdog_trello_cards
)


__all__ = [
    "check_and_create_trello_cards",
    "watchdog_trello_cards"
]
