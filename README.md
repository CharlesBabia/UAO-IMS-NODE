# UAO-IMS
THIS IS A SPORTS EQUIPMENT INVENTORY MANAGEMENT SYSTEM DESIGNED FOR THE UNIVERSITY ATHLETICS OFFICE FOR THE USE OF XU STUDENTS AND FACULTY<br>
This is a simple system using only html, css, and js.<br>
The database used for this is from firestore using NoSQL
# FUNCTIONS
### AUTHENTICATION AND AUTHORIZATION
Users can register using their XU email in order to login<br>
The system limits user to only be able to register using their XU email<br>
Upon login users will be transported to the User Dashboard and admin to the Admin Dashboard<br>
### SEARCH FUNCTION
Users can search available equipment by name or filter them by category<br>
### BORROWING
Users can send borrow requests for equipments which the admin will then accept or reject
### RETURNING
Admin can mark borrowed equipment as returned which admin can then mark the condition of the returned equipment as "good" or "damaged<br>
### PENALTY
Once admin marks the returned equipment as damaged the system will automatically penalize the user who borrowed the equipment<br>
Only admin can remove the penalty status of the said user<br>
Users who are penalized will not be able to borrow equipment until admin lifts their penalty<br>
### ADDING EQUIPMENT
Admin can add new equipment<br>
### EQUIPMENT MANAGEMENT
Admin can update the quantity of equipment as well as their condition<br>
Equipment marked as damaged can no longer be updated by the admin and the only option is the delete them

# THIS IS STILL FOR TESTING
RUN ON Localhost or Live Server using Live Server extension on Visual Studio Code<br>