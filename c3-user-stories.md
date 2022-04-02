Please edit this template and commit to the master branch for your user stories submission.   
Make sure to follow the *Role, Goal, Benefit* framework for the user stories and the *Given/When/Then* framework for the Definitions of Done! You can also refer to the examples DoDs in [C3 spec](https://sites.google.com/view/ubc-cpsc310-21w2-intro-to-se/project/checkpoint-3).

## Template
As a \<role\>, I want to \<goal\>, so that \<benefit\>.


#### Definitions of Done(s)
Scenario 1: \<The name for the behaviour that will be described\>  
Given: \<Some initial application state (precondition)\>  
When: \<The user do some series of action\>  
Then: \<Some outcome state is expected (post-condition)\>


## User Story 1
As a UBC staff, I want to be able to find out the historical average of a 
course over a defined period of time in the past, so that I have a reference 
point for determining the evaluation standards of the current year. 


#### Definitions of Done(s)
<ins>Scenario 1: Valid Search Criteria</ins>  
Given: the user is on the Historical Average section of the query page  
When: a valid pair of course code and time range is entered, and "search" is clicked  
Then: the website displays the name and average score of the section in the specified period

<ins>Scenario 2: Invalid Search Criteria</ins>  
Given: the user is on the Historical Average section of the query page   
When: either an invalid course code or time range is entered, and "search" is clicked  
Then: the website shows error and highlights the invalid field, and prompts the user to enter again   

<ins>Scenario 3: Valid Search Criteria, Empty Result</ins>   
Given: the user is on the Historical Average section of the query page   
When: a valid pair of course code and time range is entered, and "search" is clicked   
Then: the website indicates that the query result is empty

## User Story 2
As an event organiser, I want to be able to find classrooms with at least 20 seats and
movable tables, so that group discussions can be carried out. 

#### Definitions of Done(s) 
<ins>Scenario 1: Valid Search Criteria</ins>  
Given: The user is on the room searching section  
When: The user enters a valid 'minimum seats' number and selects the desired furniture type(s), 
and then clicks "search".  
Then: the website shows a table listing the information of rooms that fit the criteria.  

<ins>Scenario 2: Invalid Search Criteria</ins>  
Given: The user is on the room searching section   
When: The user provides an invalid furniture type 
Then: the website shows red text next to the invalid field

<ins>Scenario 3: Valid Search, Empty Result</ins>  
Given: The user is on the room searching section   
When: The user provides a valid criteria with no matching rooms
Then: the website indicates that the query result is empty



## Others
You may provide any additional user stories + DoDs in this section for general TA feedback.  
Note: These will not be graded.
