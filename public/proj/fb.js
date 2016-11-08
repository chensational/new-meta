var indexpath = 'https://newmeta.herokuapp.com'; // 'http://localhost:5000'; //'https://newmeta.herokuapp.com'
var limitDate = Date.now();

(function(){ //fills past-comments with past 20 comments submitted
	loadComments();
})();

$('#contact-form').on('submit', function(e){
	e.preventDefault();
	var username_fb = $('#form_name').val();	
	var comment_fb = $('#form_message').val();
	var reqParam = {
		type: 'update',
		username: username_fb,
		comments: comment_fb
	}
	$('#debug').append(reqParam);	
	var posting = $.post(indexpath+'/feedback',reqParam);
	posting.done(function(dbresults){
		var postDate = new Date(dbresults._id);
		var logDate = postDate.toLocaleDateString();
		$('#debug').append("dbresults: "+JSON.stringify(dbresults));
		$('.comments-list').prepend('<li><div class="comment-main-level" id="'+dbresults.date+'">'+'<div class="comment-box"><div class="comment-head">'+'<h6 class="comment-name by-author">'+dbresults.username+'</h6>'+'<span>'+logDate+'</span>'+'<i class="fa fa-heart"></i></div><div class="comment-content">'+dbresults.comments+'</div></div></li>')
	})
})

$('.loadmore').on("click", function(){
	loadComments();
});

function loadComments(){
	var reqParam = {
		type: 'load',
		limitDate: limitDate
	}
	var posting = $.post(indexpath+'/feedback',reqParam);
	posting.done(function(dbresults){
		if(dbresults.length>0){
			for(n in dbresults){
				var postDate = new Date(dbresults[n]._id);
				var logDate = postDate.toLocaleDateString();
				$('.comments-list').append(
					'<li><div class="comment-main-level" id="'+dbresults[n]._id+'">'+
					'<div class="comment-box"><div class="comment-head">'+
					'<h6 class="comment-name by-author">'+dbresults[n].username+'</h6>'+
					'<span>'+logDate+'</span>'+
					'<i class="fa fa-heart"></i></div><div class="comment-content">'+dbresults[n].comments+
					'</div></div></li>')
			}
			limitDate = dbresults[n]._id ; 
		}		
	})
}