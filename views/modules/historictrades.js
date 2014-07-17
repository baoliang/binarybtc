function showhistoric(data, user, trim){
    if (!trim) trim = 0;
    var twins = 0;
    var tpush = 0;
    var tlosses = 0;
    var tid = 0;
    $('.historictrades').html('');
    var tradehtml = '';
    if (trim==0) tradehtml = tradehtml+ '<div class="userblock"><div class="header" data-translate="historictrades">Historic Trades <span style="float:right"><span class="green twins">x</span>/<span class="orange tpush">y</span>/<span class="red tlosses">z</span></span></div>';    
    if (trim>0) tradehtml = tradehtml+ '<div class="userblock"><div class="header" data-translate="lasttrades">Last Trades </div>';    
    if (data) {
    tradehtml = tradehtml + '<div class="row-fluid"><div class="span12"><div><table class="table" id="historictrades">';
    tradehtml = tradehtml + '<tbody>';
    var index;
    for (index = 0; index < data.length; ++index) {
      entry = data[index];
       //console.log(entry.symbol);
      entry.symbol = symbolSwitch(entry.symbol);

      if (entry.user == user) {
        var possiblewin = (+entry.amount+(entry.amount*entry.offer));
        possiblewin = possiblewin.toFixed(2);
        entry.price = Number(entry.price);

        if (entry.direction == 'Call') {
          var arrowhtml = '<span style="opacity: 0.7" class="glyphicon glyphicon-arrow-up"></span>';
        } else if (entry.direction == 'Put') {
          var arrowhtml = '<span style="opacity: 0.7" class="glyphicon glyphicon-arrow-down"></span>';
        }


        var coeff = 1000 * 60 * 1;
        var entrytime = new Date(0);
        var entrydate = new Date(0);
        var iodate = new Date(0);
        entrytime.setUTCMilliseconds(entry.time);
        entrydate.setUTCMilliseconds(entry.time);
        iodate.setUTCMilliseconds(entry.time);
        entrytime = new Date(Math.round(entrytime.getTime() / coeff) * coeff);
        entrydate = new Date(Math.round(entrydate.getTime() / coeff) * coeff);
        iodate = new Date(Math.round(iodate.getTime() / coeff) * coeff);
        entrytime = entrytime.customFormat( "#hhh#:#mm#:#ss# " );
        entrydate = entrydate.customFormat( "#DD#/#MM#/#YYYY#" );
        iodate = iodate.toISOString();

        if (tid <= trim) {
        if (entry.outcome == 'Win') {
          twins++;
          var thumbhtml = '<span class="green" data-translate="won">Won</span></td><td> '+possiblewin+'</span></td>';
        } else if (entry.outcome == 'Lose') {
          tlosses++;
          var thumbhtml = '<span class="red" data-translate="lost">Lost</span></td><td> '+entry.amount+'</span></td>';
        } else if (entry.outcome == 'Tie') {
          tpush++;
          var thumbhtml = '<span class="orange">Push</span></td><td></i>'+entry.amount+'</span></td>';
        }
        tradehtml = tradehtml + '<tr class="historictrade" id="'+entry._id+'">' +
                    '<td class="symbol keystonelink" id="'+entry.symbol+'">'+entry.symbol+'</td>'+
                    '<td><time class="timeago" datetime="'+iodate+'">'+entrytime+'</time></td>'+
                    '<td>'+arrowhtml+' <span class="tradeprice">'+entry.price+'</span></td>'+
                    //'<td title="Expires: '+thisdate+' '+thistime+'">'+thistime+'</td>'+
                    '<td>'+thumbhtml+'</td>'+
                    //'<td class="bold" title="Expires: '+thisdate+' '+thistime+'">Trade in: <span class="expiretime"></span></td>'+
                  '</tr>';
        if (trim > 0) tid++;
      } 
    }
  }
}
    tradehtml = tradehtml + '</div></div></div></tbody></table></div>';
    $('.historictrades').html(tradehtml);
    $('.twins').html(twins);
    $('.tpush').html(tpush);
    $('.tlosses').html(tlosses);
}
function showallhistoric(data, user, trim){
    var twins = 0;
    var tpush = 0;
    var tlosses = 0;
    if (!trim) trim = 0;
    var tid = 0;
    $('.allhistorictrades').html('');
    var tradehtml = '';
    if (trim==0) tradehtml = tradehtml+ '<div class="userblock"><div class="header" data-translate="historictrades">Historic Trades <span style="float:right"><span class="green twins">x</span>/<span class="orange tpush">y</span>/<span class="red tlosses">z</span></span></div>';    
    if (trim>0) tradehtml = tradehtml+ '<div class="userblock"><div class="header" data-translate="lasttrades">Last Trades</div>';    
    if (data) {
    tradehtml = tradehtml + '<div class="row-fluid"><div class="span12"><div><table class="table" id="historictrades">';
    tradehtml = tradehtml + '<tbody>';
    var index;
    for (index = 0; index < data.length; ++index) {
      entry = data[index];
       //console.log(entry.symbol);
      entry.symbol = symbolSwitch(entry.symbol);

      if (entry.user == user) {
        var possiblewin = (+entry.amount+(entry.amount*entry.offer));
        possiblewin = possiblewin.toFixed(2);
        entry.price = Number(entry.price);

        if (entry.direction == 'Call') {
          var arrowhtml = '<span style="opacity: 0.7" class="glyphicon glyphicon-arrow-up"></span>';
        } else if (entry.direction == 'Put') {
          var arrowhtml = '<span style="opacity: 0.7" class="glyphicon glyphicon-arrow-down"></span>';
        }

        var coeff = 1000 * 60 * 1;
        var entrytime = new Date(0);
        var entrydate = new Date(0);
        var iodate = new Date(0);
        entrytime.setUTCMilliseconds(entry.time);
        entrydate.setUTCMilliseconds(entry.time);
        iodate.setUTCMilliseconds(entry.time);
        entrytime = new Date(Math.round(entrytime.getTime() / coeff) * coeff);
        entrydate = new Date(Math.round(entrydate.getTime() / coeff) * coeff);
        iodate = new Date(Math.round(iodate.getTime() / coeff) * coeff);
        entrytime = entrytime.customFormat( "#hhh#:#mm# " );
        entrydate = entrydate.customFormat( "#DD#/#MM#/#YYYY#" );
        iodate = iodate.toISOString();

        if (tid <= trim) {
        if (entry.outcome == 'Win') {
          twins++;
          var thumbhtml = '<span class="green" data-translate="won">Won</span></td><td> '+possiblewin+'</span></td>';
        } else if (entry.outcome == 'Lose') {
          tlosses++;
          var thumbhtml = '<span class="red" data-translate="lost">Lost</span></td><td> '+entry.amount+'</span></td>';
        } else if (entry.outcome == 'Tie') {
          tpush++;
          var thumbhtml = '<span class="orange">Push</span></td><td> '+entry.amount+'</span></td>';
        }
        tradehtml = tradehtml + '<tr class="historictrade" id="'+entry._id+'">' +
                    '<td class="symbol">'+entry.symbol+'</td>'+
                    '<td><time class="timeago" datetime="'+iodate+'">'+entrydate+' '+entrytime+'</time></td>'+
                    '<td>'+arrowhtml+' <span class="tradeprice">'+entry.price+'</span></td>'+
                    //'<td title="Expires: '+thisdate+' '+thistime+'">'+thistime+'</td>'+
                    '<td>'+thumbhtml+'</td>'+
                    //'<td class="bold" title="Expires: '+thisdate+' '+thistime+'">Trade in: <span class="expiretime"></span></td>'+
                  '</tr>';
        if (trim > 0) tid++;
      } 
    }
  }
}
    tradehtml = tradehtml + '</div></div></div></tbody></table></div>';
    $('.allhistorictrades').html(tradehtml);
    $('.twins').html(twins);
    $('.tpush').html(tpush);
    $('.tlosses').html(tlosses);
}