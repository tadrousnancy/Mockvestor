from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from pathlib import Path
import re
import configparser
import shutil


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

        # TODO: change if needed
        #  check if username already exists
        user_dir = Path(__file__).parent.parent / "users" / username
        if Path(user_dir).is_dir():
            raise ValueError("Username already exists!")

        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long!")
        if len(password) > 128:
            raise ValueError("Password is too long!")
        if not has_special_char(password) or not has_digit(password):
            raise ValueError("Password must contain at least one digit and special character!")

        # create user directory
        user_dir.mkdir()

        # TODO: change if needed
        #  save username and hash in config file
        hashed = self.ph.hash(password)
        config = configparser.ConfigParser()
        config["account"] = {
            "username": username,
            "password": hashed
        }
        with open(user_dir / "cred.ini", "w") as file:
            config.write(file)

        return True

    def login(self, username, password):
        """
        Verify that username and password are correct
        If both are correct, return True
        Otherwise, return False
        """

        # TODO: change if needed
        #  verify username exists
        user_dir = Path(__file__).parent.parent / "users" / username
        if not Path(user_dir).is_dir():
            return False

        # TODO: change if needed
        #  verify password matches stored hash
        config = configparser.ConfigParser()
        config.read(user_dir / "cred.ini")
        stored_hash = config["account"]["password"]
        try:
            self.ph.verify(stored_hash, password)
            return True
        except VerifyMismatchError:
            return False

    def change_password(self, username, old_password, new_password):
        """
        Allows user to change their existing password
        Old password must be correct
        New password must be different from old password
        New password must meet general criteria
        Returns True on success
        """

        config_path = user_dir = Path(__file__).parent.parent / "users" / username / "cred.ini"

        # TODO: change if needed
        #  check that old password is correct
        config = configparser.ConfigParser()
        config.read(config_path)
        stored_hash = config["account"]["password"]
        try:
            self.ph.verify(stored_hash, old_password)
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

        # TODO: change if needed
        #  remove old password and replace it with new one
        new_hash = self.ph.hash(new_password)
        config["account"]["password"] = new_hash
        with open(config_path, "w") as file:
            config.write(file)

        return True

    def delete_account(self, username, password):
        """
        Deletes username and password from wherever they are stored
        User must retype their password before committing
        Will also delete save data?
        Returns True on success
        """""

        # TODO: change if needed
        #  verify password
        config_path = Path(__file__).parent.parent / "users" / username / "cred.ini"
        config = configparser.ConfigParser()
        config.read(config_path)
        stored_hash = config["account"]["password"]
        try:
            self.ph.verify(stored_hash, password)
        except VerifyMismatchError:
            raise ValueError("Password is incorrect!")

        # TODO: change if needed
        #  delete account data
        user_dir = config_path.parent
        shutil.rmtree(user_dir)
        return True

