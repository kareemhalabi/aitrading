# AI Trading

## Description

AI Trading was an application developed for the Applied Investments class (FINE 541) at McGill to facilitate the approval/execution of stock and bond trades. A primary activity of the course involves managing an investment portfolio where trades were formally sent by email to the professor who would approve them before they were executed by an authorized trader, however several issues including incorrect formatting, missing data and not notifying other members caused problems for the professor and authorized trader. AI Trading solves these problems by providing a web interface for students to log in, get stock quotes, fill in the remaining trade details and submit with all formatting and email delivery handled on the backend. Also included are several error checks, input validators as well as the convenience of viewing the current stocks and cash available in the group's portfolio.

The application is built on Django using a PostgreSQL database with a fairly heavy amount of front-end Javascript/JQuery code. Security information is scraped from the [Morningstar UK](http://www.morningstar.co.uk/uk/) website (As there was no publicly available API that included ISIN data), FX data is obtained by an AJAX call to [fixer.io](http://fixer.io/) and the portfolio data is pulled from Pershing via SFTP. I have also utilized a library called [django-registration](https://django-registration.readthedocs.io) to support the use of activation emails and all emails are delivered through [SendGrid](https://sendgrid.com/)'s SMTP service.

## Table of contents

- [Technical Installation](#technical-installation)
  * [Environment Variables](#environment-variables)
  * [Database and Superuser Setup](#database-and-superuser-setup)
- [Usage](#usage)
  * [Admin](#admin)
  * [Regular Users](#regular-users)
    + [Registration](#registration)

## Technical Installation

### Environment Variables
A few environment variables are needed to ensure proper functionality. (Includes some default ones required by Django)

1. **SECRET_KEY** : Django's secret key, pick a random string
2. **DJANGO_SETTINGS_MODULE** : Location of Django settings module
2. **DEBUG** : Set to True if on development, ignore or set to false on production
3. **DATABASE_URL** : URL of PostgreSQL database
4. **SENDGRID_API_KEY** : The API key used to send emails via SMTP
5. **QUOTAGUARDSTATIC_URL** : The proxy url given by QuotaGuard (a Heroku add on). Not required if the server hosting this application has a static IP
6. **PKEY_PASSWORD** : The password to decrypt the private DSA key for SFTP access to Pershing server

### Database and Superuser Setup

1. Run `python manage.py migrate` to create user tables from the models
2. Run `python manage.py createsuperuser` to create a superuser that can log into the admin page
3. Go to the admin page, click to "Users" under the "Authentication and Authorization" pane and select the user just created
4. Under the groups section assign the superuser the group "supervisor" by clicking on the + icon to make a new group. Then save at the bottom of the page.
**NOTE: Only one "supervisor" can exist in the application, do not assign this group to any other user**

## Usage

### Admin

The first step at the beginning of each year is to delete all users from the previous year so that they are no longer able to access the service.
1. On the admin page, go to "Users" and under the "Filter" pane, section "By staff status" click on "No". This refines the list to all non-staff users.
2. Select all users with the top left checkbox and under the "Action" drop down menu, select "Delete Selected Users". Click "Go" and confirm the accounts to be deleted. **Double check to ensure you do not delete your own account**
3. Return to the Admin Home and click "Authorized users"
4. As in step 2, delete all users.

Now you can begin adding in the new group members by clicking on "Add Authorized User" in the top right. This links each student's email with an trading group so that when they create their account on the site in their own time, they are automatically associated with the correct group.

### Regular Users

#### Registration
Registering an account can be done at /accounts/register. Enter your McGill email (all lowercase) and follow the steps. Note that your unsername is what you will use to login **not your email address**.

#### Trading Bonds
Bond information must all be entered manually as this data is not available on Morningstar UK. For the price, use a par value of 1, not 100
