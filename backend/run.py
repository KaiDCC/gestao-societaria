from app import create_app
from app.config import Config
from app.scheduler.scheduler import start_scheduler_once
from app.services.trello import check_and_create_trello_cards

app = create_app()

if __name__ == "__main__":
    with app.app_context():
        check_and_create_trello_cards()
        start_scheduler_once(app)

    app.run(
        host=Config.FLASK_HOST,
        port=Config.FLASK_PORT,
        debug=Config.FLASK_DEBUG,
        use_reloader=False
    )
