jQuery(document).ready(function(){jQuery(document).on('click','.fpf-fields-config',function(event,variation){var values=jQuery('form.cart').serialize().split('&');var items=[];var keys=[];var length=fpf_product.fpf_fields.length;for(var i=0;i<length;i++){var field_key=fpf_product.fpf_fields[i].id;if(fpf_product.fpf_fields[i].type==='multiselect'){field_key+='[]'}
keys.push(field_key)}
jQuery.each(values,function(i,val){var field_data=val.split('=');if((keys.indexOf(decodeURIComponent(field_data[0]))===-1)||(field_data[1]==='')){return}
items.push(val)});if(!items){return}
var new_url=jQuery('form.cart').attr('action');new_url+='?'+items.join('&');location.replace(new_url)})})