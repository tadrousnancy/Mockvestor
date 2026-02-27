from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
import re
from ..models.user import User
from sqlmodel import select


def has_special_char(text):
    """
    Returns True if string has a special char
    Returns False if it does not
    """
    pattern = r'[^a-zA-Z0-9_]'
    return bool(re.search(pattern, text))


def has_digit(text):
    """
    Returns True if string has a digit
    Returns False if it does not
    """
    pattern = r'[0-9]'
    return bool(re.search(pattern, text))


class Account:
    def __init__(self):
        self.ph = PasswordHasher()

    def create_account(self, username, password):
        """
        Creates a new username and password
        Usernames must have length of 3-20 and NO special chars (e.g. '!', '*', '?')
        Passwords must have length of 8-128 and have at least one special char and digit
        Passwords are stored as hashes, which are unreadable/irreversible
        Returns True if successful
        """

        # check username and password
        if len(username) < 3 or len(username) > 20:
            raise ValueError("Username must be 3-20 characters long!")
        if has_special_char(username):
            raise ValueError("Username must not have any special characters!")
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long!")
        if len(password) > 128:
            raise ValueError("Password is too long!")
        if not has_special_char(password) or not has_digit(password):
            raise ValueError("Password must contain at least one digit and special character!")

        return True

    def login(self, username, password, session):
        """
        Verify that username and password are correct
        If both are correct, return True
        Otherwise, return False
        """

        # verify username exists in database
        statement = select(User).where(User.username == username)
        user = session.exec(statement).first()
        if user is None:
            return False

        # verify password matches stored hash
        try:
            self.ph.verify(user.hashed_password, password)
            return True
        except VerifyMismatchError:
            return False

    def change_password(self, username, old_password, new_password, session):
        """
        Allows user to change their existing password
        Old password must be correct
        New password must be different from old password
        New password must meet general criteria
        Returns True on success
        """

        statement = select(User).where(User.username == username)
        user = session.exec(statement).first()

        # verify old password
        try:
            self.ph.verify(user.hashed_password, old_password)
        except VerifyMismatchError:
            raise ValueError("Old password is incorrect!")

        # make sure new password is different
        if old_password == new_password:
            raise ValueError("New password must be different!")

        # ensure new password meets criteria
        if len(new_password) < 8:
            raise ValueError("New password must be at least 8 characters long!")
        if len(new_password) > 128:
            raise ValueError("New password is too long!")
        if not has_special_char(new_password) or not has_digit(new_password):
            raise ValueError("New password must contain at least one digit and special character!")

        # replace old password with new one
        new_hash = self.ph.hash(new_password)
        user.hashed_password = new_hash

        # commit changes to supabase
        session.add(user)
        session.commit()

        return True

    def delete_account(self, username, password, session):
        """
        Deletes username and password from wherever they are stored
        User must retype their password before committing
        Will also delete save data?
        Returns True on success
        """""

        statement = select(User).where(User.username == username)
        user = session.exec(statement).first()

        # verify password
        try:
            self.ph.verify(user.hashed_password, password)
        except VerifyMismatchError:
            raise ValueError("Password is incorrect!")

        # delete user
        session.delete(user)
        session.commit()
        return True
