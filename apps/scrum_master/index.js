
var nodemailer = require('nodemailer');
var alexa = require('alexa-app');
//var chatskills = require('chatskills');
//var readlineSync = require('readline-sync');
var xml2js = require('xml2js').parseString;
var request = require('request');
var deasync = require('deasync');
var XLSX = require('xlsx');

// Define an alexa-app
var app = new alexa.app('scrum_master');
//var app = chatskills.app('books');
var developerNames = [ 'Nandita', 'Nazeer', 'Vijay', 'Tao', 'Anshul', 'Harry' ];

var teamname='';
var conversationDetails = new Array;


function conversationdetail(jiraId,developerName,intent,response){
 this.jiraId=jiraId;
 this.developerName=developerName;
 this.intent=intent;
 this.response=response;
 
 return this;
}
function setConversationDetails(jiraId,developerName,intent,response){
 var convDetail=new conversationdetail(jiraId,developerName,intent,response);
 conversationDetails.push(convDetail);
}

//Email Functionality Start

function getTodayDate(){
 
var today = new Date();
var dd = String(today.getDate()).padStart(2, '0');
var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
var yyyy = today.getFullYear();
today = mm + '/' + dd + '/' + yyyy;
console.log(today);
return today;
}
function createEmailBody(details){
 
 
var emailbody='<html><head><style>table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}'+
'td, th { border: 1px solid #dddddd;text-align: left;padding: 8px;}'+'tr:nth-child(even) {background-color: #dddddd;}</style></head><body>'+
'<h2>Scrum Details</h2><table>';
  emailbody+='<tr>'+
    '<td>Jira Id</td>'+
 '<td>Title</td>'+
    '<td>Developer</td>'+
 '<td>Percentage Completed</td>'+
 '<td>Blockers</td>'+
 '<td>Comments</td>'+    
 '</tr>';
 
 for(j = 0;j< details.length ;j++){
  console.log(j);
  emailbody+='<tr>'+'<td>'+details[j].id+'</td>'
  +'<td>'+details[j].developer+'</td>'
  +'<td>'+details[j].title+'</td>';
  var percentageCompleted='<td></td>';
  var blockers='<td></td>';
  var comments='<td></td>';
  for(i = 0; i< conversationDetails.length ;i++){
    if(details[j].id===conversationDetails[i].jiraId){
      if(conversationDetails[i].intent==="percentage"){
       percentageCompleted='<td>'+conversationDetails[i].response+'</td>';
      }
      if(conversationDetails[i].intent==="blockers"){
        blockers='<td>'+conversationDetails[i].response+'</td>';
      }
        
      
      if(conversationDetails[i].intent==="comments"){
        comments='<td>'+conversationDetails[i].response+'</td>';
      }
     
   
   
    }
  }
   
  emailbody+=percentageCompleted+blockers+comments+'</tr>';
 }
 
 emailbody+='</table></body></html>';
 
 console.log(emailbody);
 return emailbody;
 
}

function sendEmail(details){
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'hussain.kizhakkedathu@gmail.com',
    pass: 'wucufzgiqqxiqcjl'
  }
});

var mailOptions = {
  from: 'hussain.kizhakkedathu@gmail.com',
  to: 'nanditakommana@gmail.com,vijay.narayanan25@gmail.com,jishuthomas@gmail.com',
  subject: getTodayDate()+' : Scrum Summary for '+teamname,
  html: createEmailBody(details)
};
transporter.sendMail(mailOptions, function(error, info){
  if (error) {
    console.log(error);
  } else {
    console.log('Email sent: ' + info.response);
  }
});
}

function getExcel(){
	var xl = XLSX.readFile('JIRA_EXCEL.xlsx');
	
	return xl;
}

function getJiraDetails() {
	var workbook = getExcel();
	var sheet_name_list = workbook.SheetNames;
	var jira = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
	console.log(jira);
	/*var jira = null;
	jira = [{ id: 1234, title: 'Alexa skill', totalhours: 6, completed : 1, status : 'In progress' , developer : 'Nandita'},
			{ id: 1235, title: 'Jira creation', totalhours: 2, completed : 1, status : 'In progress' , developer : 'VJ'},
			{ id: 1235, title: 'Jira creation', totalhours: 2, completed : 1, status : 'In progress' , developer : 'Anshul'}
			];*/
	return jira;
}

function getJiraInstance(req){
	var jira = req.session('jira');
	var context = req.session('context');	
	var jiraInstance = null;
	for(i = 0; i < jira.length;i++){
		if(jira[i].id == context.jiraid){
			jiraInstance = jira[i];
			break;
		}
	}
	return jiraInstance;
}

function getContext(req){
	var i;
	var localDeveloper, localCounter,localJiraId;
	var jira = req.session('jira');
	var context = req.session('context');	
	
	if(context){
		for(i = context.counter; i < jira.length;i++){
			localJiraId = jira[i].id;
			localDeveloper = jira[i].developer;
			localCounter = i+1;
			break;
		}
	}
	else{
		for(i = 0; i < jira.length;i++){
			localJiraId = jira[i].id;
			localDeveloper = jira[i].developer;
			localCounter = i+1;
			break;
		}
	}
	context = {jiraid : localJiraId, developer : localDeveloper,counter : localCounter};
	return context;
}

app.launch(function(req,res) {
  res.say('Hello everyone, good evening. Welcome to UBS Scrum daily stand up meeting. Let us start by going through the progress of each Jira item. Please let me know the team name for this meeting.').shouldEndSession(false);
});

app.intent('getTeamName', {
        'slots': {'TeamName': 'AMAZON.FirstName'},
        'utterances': ['Team name is {-|TeamName}',
                       'Our team name is {-|TeamName}',
					   'My team name is {-|TeamName}'
					   ]
    }, function(req,res) {
	  teamname = req.slot('TeamName');
	  
	  if (teamname) {
		
        message = "Let me get the details from the Jira server for the team " + teamname + ". ";
		// Jira has to be there, otherwise the code wont work
		jira = getJiraDetails();
		res.session('jira', jira);
		res.say(message).shouldEndSession(false);
		if(jira){
			
			context = getContext(req);
			res.session('context', context);
			var jiraInstance = getJiraInstance(req);
			
			message = "Now I have all the details needed for this meeting. Let us commence the meeting with " + context.developer + ". ";
			message += "What is the status of the jira id " + context.jiraid + ", which is " + jiraInstance.title + ". ";
		}
      }
      else {
        message = 'Please let me know the team name for this meeting.';
      }

      res.say(message).shouldEndSession(false);
    }
);

app.intent('getStatus', {
        'slots': {'percent': 'percent'},
		'utterances': ['{I have|} {completed|finished} {-|percent} {percentage|percent|}',
						'I am {-|percent} way through'
					   ]
    }, function(req,res) {
	  var percent = req.slot('percent');
	  var endSession = false;
	  if (percent) {
		console.log(percent);
        message = "That's amazing! ";
		res.say(message).shouldEndSession(false);
		jira = req.session('jira');
		var context = getContext(req);
		res.session('context', context);
		var jiraInstance = getJiraInstance(req);
		
		if(jira){
			if(context && context.jiraid){
				message = "What about you " + context.developer + "? ";
				message += "What is the status of the jira id " + context.jiraid + ", which is " + jiraInstance.title + ".";
				setConversationDetails(context.jiraid ,context.developer,"percentage",percent);
			}
			else{
				message = "We have reached the end of the meeting. Will send you the mail with the minutes of the meeting. Have a nice day. " ;
				sendEmail(jira);
				endSession = true;
			}
		}
      }
      else {
        message = 'Sorry, could not understand your response. Can you please let me know how much have you completed?';
      }
		if(endSession == false){
			res.say(message).shouldEndSession(false);
		}
		else{
			res.say(message).shouldEndSession(true);
		}
    }
);

app.intent('blocked', {
        'slots': {'TitleOne': 'TITLE',
                  'TitleTwo': 'TITLE',
                  'TitleThree': 'TITLE',
                  'TitleFour': 'TITLE',
                  'TitleFive': 'TITLE'},
		'utterances': [
						'I {am blocked|cannot proceed} {due to|because of} {-|TitleOne}',
						'I {am blocked|cannot proceed} {due to|because of} {-|TitleOne} {-|TitleTwo}',
						'I {am blocked|cannot proceed} {due to|because of} {-|TitleOne} {-|TitleTwo} {-|TitleThree}',
						'I {am blocked|cannot proceed} {due to|because of} {-|TitleOne} {-|TitleTwo} {-|TitleThree} {-|TitleFour}',
						'I {am blocked|cannot proceed} {due to|because of} {-|TitleOne} {-|TitleTwo} {-|TitleThree} {-|TitleFour} {-|TitleFive}'
					   ]
    }, function(req,res) {
		var title = req.slot('TitleOne');
		var devName='';
		if (title) {
			var message = '';

			// Capture additional words in title.
			var TitleTwo = req.slot('TitleTwo') || '';
			var TitleThree = req.slot('TitleThree') || '';
			var TitleFour = req.slot('TitleFour') || '';
			var TitleFive = req.slot('TitleFive') || '';
			
			// Concatenate all words in the title provided.
			title += ' ' + TitleTwo + ' ' + TitleThree + ' ' + TitleFour + ' ';
			title += TitleFive;
		
			// Trim trailing comma and whitespace.
			title = title.replace(/,\s*$/, '');
			
			title = title.toLowerCase();
		}
		var i;
		var devFound = false;
		var context = getContext(req);
		for(i = 0; i< developerNames.length;i++){
			devName=developerNames[i];
			//console.log(title + " : " + developerNames[i]);
			if(title.includes(developerNames[i].toLowerCase())){
				message = developerNames[i] + ". Do you think you can help here?";
				 devFound = true;
				 devName=developerNames[i];
				 break;
			}
		}
		setConversationDetails(context.jiraid ,context.developer,"blockers","Yes");
		setConversationDetails(context.jiraid ,context.developer,"comments","Will reach out to "+devName);
		 if(devFound == false){
			 message = "Ok noted! Who do you think can help you in this?";
		 }

      res.say(message).shouldEndSession(false);
    }
);

app.intent('canHelp', {
        'slots': {},
		'utterances': [
						'{Yes|Yeah|Sure|Ok|} {I|} {can|will} {help}',
						'{I|} {can|will} {try to|} {help}',
						'{Yes|Yeah|Sure|Ok}'
					   ]
    }, function(req,res) {
		var message="That is great. Thank you. "
		res.say(message).shouldEndSession(false);
		jira = req.session('jira');
		var context = getContext(req);
		res.session('context', context);
		var jiraInstance = getJiraInstance(req);
		
		if(jira){
			if(context && context.jiraid){
				message = " Lets move on to the next Jira. How are you doing " + context.developer + "? ";
				console.log("Jira ID: ")+context.jiraid;
				message += "What is the status of the jira id " + context.jiraid + ", which is " + jiraInstance.title + ".";
				res.say(message).shouldEndSession(false);
			}else{
				message = "We have reached the end of the meeting. Will send you the mail with the minutes of the meeting. Have a nice day." ;
				sendEmail(jira);
				res.say(message).shouldEndSession(true);
			}
		}
    }
);

app.intent('cannotHelp', {
        'slots': {},
		'utterances': [
						'{No|Nope} {I|} {cannot} {|help}',
						'{No|Nope}'
					   ]
    }, function(req,res) {
		var message="Ok. Please take it offline. "
		res.say(message).shouldEndSession(false);
		jira = req.session('jira');
		var context = getContext(req);
		res.session('context', context);
		var jiraInstance = getJiraInstance(req);
		
		if(jira){
			if(context && context.jiraid){
				message = "Lets move on to the next Jira which is assigned to " + context.developer +". What is the status of the jira id " + context.jiraid + ", which is " + jiraInstance.title + ".";
				res.say(message).shouldEndSession(false);
			}else{
				message = "We have reached the end of the meeting. Will send you the mail with the minutes of the meeting. Have a nice day." ;
				sendEmail(jira);
				res.say(message).shouldEndSession(true);
			}
		}
    }
);


module.exports = app;
/*
chatskills.launch(app);

// Console client.
var text = ' ';
while (text.length > 0 && text != 'quit') {
    text = readlineSync.question('> ');

    // Respond to input.
    chatskills.respond(text, function(response) {
        console.log(response);
    });
}*/