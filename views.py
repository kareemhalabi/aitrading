import re
from flask import render_template, request, jsonify
from markupsafe import Markup

from ai_trading import ai_trading, db, AuthorizedUser
from morningstar_crawler import find_by_isin, find_by_ticker

from sqlalchemy.exc import IntegrityError

@ai_trading.route('/')
def index():
    return render_template("trade.html")

@ai_trading.route('/admin')
def admin():
    authorized_users = AuthorizedUser.query.order_by(AuthorizedUser.account).all()
    return render_template("admin.html", authorized_users=authorized_users)

@ai_trading.route('/admin/add_authorized_user', methods=['POST'])
def add_authorized_user():

    # Email regex from https://stackoverflow.com/questions/46155/validate-email-address-in-javascript
    email_pattern = re.compile(
        r'^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$')
    account_pattern = re.compile(r'^[A-Z0-9]{12}$')

    user = request.get_json()
    if(email_pattern.match(user['email']) and account_pattern.match(user['account'])):
        try:
            db.session.add(AuthorizedUser(**user))
            db.session.commit()
            return ""
        except IntegrityError as e:
            if(str(e).find("duplicate") != -1):
                return "User already exists"
            else:
                return str(e)
        except Exception as e:
            return str(e)
    else:
        return "Invalid email/account"

@ai_trading.route('/admin/delete_authorized_user', methods=['POST'])
def delete_authorized_user():
    AuthorizedUser.query.filter_by(email=request.get_json()['email']).delete()
    db.session.commit()
    return ""

@ai_trading.route('/noscript')
def no_script():
    redir = request.args.get("redirect")

    # Prevent erroneous redirects
    if len(redir) == 0 or redir[0] != "/":
        redirect_srcipt = Markup("")
    else:
        redirect_srcipt = Markup('window.location.replace("%s");' % redir)

    return render_template("noscript.html", redirect=redirect_srcipt)


@ai_trading.route('/search_by_isin', methods=["GET"])
def search_by_isin():
    return jsonify(find_by_isin(request.args.get("isin"), request.args.get("currency")))


@ai_trading.route('/search_by_ticker', methods=["GET"])
def search_by_ticker():
    return jsonify(find_by_ticker(request.args.get("ticker"), request.args.get("currency")))
