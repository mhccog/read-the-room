/* Read the Room: one-time copy of your data from the two older sites (same browser, same github.io address).
   Old keys are left in place so Read & Connect and Read Anyone keep working too. */
(function(){
  try{
    if(localStorage.getItem('rtr.migrated.v1'))return;
    var MAP={
      'rtr.people.v1':['bo.people.v1'],
      'rtr.current.v1':['bo.current.v1'],
      'rtr.ask.hughes.v1':['bo.ask.v1'],
      'rtr.watch.v1':['bo.watch.v1'],
      'rtr.say.favs.v1':['cyrus-say-it-v1','cyrus-read-anyone-v1'],
      'rtr.ask.blend.v1':['read-anyone-ask-v2'],
      'rtr.ask.blend.author':['read-anyone-ask-author']
    };
    var n=0;
    for(var k in MAP){
      if(localStorage.getItem(k)!=null)continue;
      for(var i=0;i<MAP[k].length;i++){var v=localStorage.getItem(MAP[k][i]);if(v!=null){localStorage.setItem(k,v);n++;break}}
    }
    localStorage.setItem('rtr.migrated.v1',JSON.stringify({at:new Date().toISOString(),copied:n}));
  }catch(e){/* private mode */}
})();
