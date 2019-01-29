var app = angular.module('app',['ui.router','ngSanitize']);

app.value('globals',{
    playerAName:'',
    playerBName:'',
    currentQuestion:0,
    data:{},
    playerHistory:[],
    opponentHistory:[],
    playerPoints:0,
    opponentPoints:0,
    opponentResponseGoodPos:0,
    opponentResponseBadPos:0,
    fuzzyScoreRequired: 0.4
});

/* ---------------------------------------------------------------------------- */

app.run(function(globals,$http){




    // Get data
    $http({
        url:'data.json'
    }).then(function successCallback(response){
        globals.data = response.data;
    },function errorCallback(error){
        alert("There was an error with the data");
    });
});

/* //////////////////////////////////////////////////////////////////////////// */

app.controller('homeControl',function($scope,globals,$timeout){
    $scope.globals = globals;

    // Set initial display
    $scope.showOverlay = false;

    // Set initial vars
    $scope.playersOnline = 1;
    $scope.studentaNumber = getRandomInt(129938,999999);
    $scope.studentbNumber = null;
    $scope.studentbName = null;
    $scope.timeWait = getRandomInt(3000,5000);


    globals.pointsEarned = 0;


    // Find opponent button pressed
    $scope.findOpponent = function(){
        $scope.showOverlay = true;
        $timeout(function(){ $scope.OpponentFound();},$scope.timeWait);
    }

    // After certain amountof time, runthis function to fake user added
    $scope.OpponentFound = function(){
        $scope.showOverlay = false;
        $scope.playersOnline = 2;
        $scope.studentbNumber = getRandomInt(129938,999999);
        $scope.studentbName = "Student"+$scope.studentbNumber;

        // Update globals
        globals.playerAName = "Student"+$scope.studentaNumber;
        globals.playerBName = $scope.studentbName;
    }

});

/* ---------------------------------------------------------------------------- */

app.controller('questionControl',function($scope,globals,$state,$sce,$location, $anchorScroll,$timeout){

    $scope.globals = globals;

    $scope.convo = {};
    $scope.convo.player = '';

    // Battle Setup
    $scope.results = false;
    $scope.questionNum = globals.currentQuestion + 1;
    $scope.questionsTotal = globals.data.content.length;
    $scope.thisBattle = globals.data.content[globals.currentQuestion];
    $scope.content = $sce.trustAsHtml($scope.thisBattle.content);

    $scope.isLastQuestion = false;
    console.log("global currentQuestion", globals.currentQuestion + 1, globals.data.content.length);
    if(globals.currentQuestion + 1 == globals.data.content.length){
      $scope.isLastQuestion = true;
    }

    $scope.answer = {};
    $scope.answer.userAnswer = null;

    $scope.playerCorrect = false;
    $scope.opponentCorrect = false;

    $scope.opponentHasAnswer = false;
    $scope.showOpponentText = false;
    $scope.opponentSays = "";

    // Response Setup
    $scope.resultResponse = "";



    $scope.showResults = function(){

        // Check Answer
        var usersAnswer = $scope.answer.userAnswer;

//////////
//!---
///CHANGE correctAnswer to ''
         var correctAnswer = '';





//////////
//!---
///separate the correct answer checks for FIB/MC
        if ($scope.thisBattle.questionType == 'FIB'){
            // console.log("FIB Question");
            if(checkArray(usersAnswer, $scope.thisBattle.answers)){//basically the same
                console.log("Exact match");
                globals.playerHistory[globals.currentQuestion] = 'correct';
                globals.playerPoints += $scope.thisBattle.pointsWorth;
                globals.pointsEarned = $scope.thisBattle.pointsWorth;
                $scope.playerCorrect = true;

            } else if ($scope.thisBattle.exactMatch == 'true') {//must be exact match
                 console.log("Requires exact match. Didn't match.");

                globals.playerHistory[globals.currentQuestion] = 'incorrect';
            }
            else if ($scope.thisBattle.exactMatch == 'false') {// fuzzy search is ok
                //First, see if they're close enough to be right
                 
                 //set FUSE options
                var options = {
                  //id: "answers",
                  include: ["matches","score"],
                  shouldSort: true,
                  tokenize: true,
                  threshold: 0.6,
                  location: 0,
                  distance: 100,
                  maxPatternLength: 32,
                  minMatchCharLength: 1,
                  keys: [
                    "answers"            ]
                };

                var fuse = new Fuse($scope.thisBattle.answers, options)

                var fuzzyScore = fuse.search(usersAnswer)[0].score;
                if (fuzzyScore < globals.fuzzyScoreRequired){
                    console.log("Fuzzy score is lower than " + globals.fuzzyScoreRequired);
                    $scope.playerCorrect = true;
                    globals.pointsEarned = ($scope.thisBattle.pointsWorth)*0.8;
                    globals.playerPoints += ($scope.thisBattle.pointsWorth)*0.8;

                }
                else{
                   globals.playerHistory[globals.currentQuestion] = 'incorrect';
                   }
            }
        }
        else if ($scope.thisBattle.questionType == 'MC'){
            correctAnswer = $scope.thisBattle.answers;
            // console.log("MC Question");
            // console.log(usersAnswer, correctAnswer);
            if(usersAnswer == correctAnswer){
                console.log(usersAnswer, correctAnswer);
                globals.playerHistory[globals.currentQuestion] = 'correct';
                globals.playerPoints += $scope.thisBattle.pointsWorth;
                globals.pointsEarned = $scope.thisBattle.pointsWorth;
                $scope.playerCorrect = true;
            } else {
               globals.playerHistory[globals.currentQuestion] = 'incorrect';
            }
        }
        





        // Determine if Opponent is right or wrong.
        var r = getRandomInt(0,11);
        var right = false;
        // Opponent is always either behind, tied, or one question ahead
        // 80% chance of getting it right, but only if they are within 100
        if(r > 2){
          if(globals.opponentPoints - globals.playerPoints < 100){
              right = true;
          }
        }

        if(right == true){
          globals.opponentHistory[globals.currentQuestion] = 'correct';
          globals.opponentPoints += $scope.thisBattle.pointsWorth;
            globals.pointsEarned = $scope.thisBattle.pointsWorth;
          $scope.opponentCorrect = true;
        } else {
            globals.opponentHistory[globals.currentQuestion] = 'incorrect';
        }

        // Responses
        if($scope.playerCorrect == true){
            $scope.opponentSays = globals.data.opponentResponses.userIsRight[globals.opponentResponseGoodPos];
            globals.opponentResponseGoodPos++;
        } else {
          $scope.opponentSays = globals.data.opponentResponses.userIsWrong[globals.opponentResponseBadPos];
          globals.opponentResponseBadPos++;
        }

        $scope.results = true;

        var wait = getRandomInt(3000,5000);
        $timeout(function(){ $scope.showOpponentAnswer();},wait);
    }

    $scope.showOpponentAnswer = function(){
        $scope.opponentHasAnswer = true;

        var wait = getRandomInt(3000,5000);
        $timeout(function(){ $scope.showOpponentResponse();},wait);
    };

    $scope.showOpponentResponse = function(){
        $scope.showOpponentText = true;
    }

    $scope.nextQuestion = function(){
        // Record player data
        var qnum = globals.currentQuestion + 1;
        var currQuest = "Question "+ qnum;

        if(globals.currentQuestion + 1 < globals.data.content.length){
          globals.currentQuestion++;
          $state.reload();
        } else {
          // Go To Final Page.
          $state.go('Final');
        }
    };
      
});


app.controller('finalControl',function($scope,globals,$state){
    $scope.globals = globals;
    $scope.hasTied = false;
    $scope.playerWins = false;
    if(globals.playerPoints > globals.opponentPoints){
      $scope.playerWins = true;
    }
    if(globals.playerPoints == globals.opponentPoints){
        $scope.hasTied = true;
    }
});


/* //////////////////////////////////////////////////////////////////////////// */

app.directive('alertFinding',function(){
    return{
      templateUrl:'js/app/templates/pieces/alertFinding.html'
    }
});

/* ---------------------------------------------------------------------------- */

app.filter("sanitize", ['$sce', function($sce) {
  return function(htmlCode){
    return $sce.trustAsHtml(htmlCode);
  }
}]);

/* ---------------------------------------------------------------------------- */

app.config(function($stateProvider,$urlRouterProvider){

    $stateProvider
      .state('Home',{
      url:'/',
      templateUrl:'js/app/templates/home.html',
      controller:'homeControl'
    }).state('Question',{
      url:'/question',
      templateUrl:'js/app/templates/question.html',
      controller:'questionControl'
   }).state('Final',{
     url:'/final',
     templateUrl:'js/app/templates/final.html',
     controller:'finalControl'
  });

    $urlRouterProvider.otherwise('/');
});

//////////
//!---
///ADD UTILITY
/*----UTILITY---*/
function checkArray(item, targetArray){
    //console.log(item);
    //console.log(targetArray);
    var isInArray = false;
    angular.forEach(targetArray, function(value, key) {
      if (value == item){isInArray = true;}
    });
    //console.log("isInArray is " + isInArray);
    return isInArray;


}