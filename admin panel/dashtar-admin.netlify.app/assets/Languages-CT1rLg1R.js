import{c as le,r as c,S as re,J as K,i as oe,L as w,j as e,a as T,n as ie,x as G,k as ce,B as D,I as de}from"./index-CgsTjVhy.js";import{k as me,l as ge,m as ue}from"./Layout-DI-TtCpp.js";import{S as fe,B as pe}from"./ShowHideButton-DEWGjMrx.js";import{D as xe}from"./DeleteModal-jOEYTwkY.js";import{T as z,l as he,D as ve,M as _e}from"./DrawerButton-DqopM6xR.js";import{u as be,F as Se,C as je,b as ye,c as Fe,E as we}from"./index.esm-CqZXtInz.js";import{I as Ne}from"./InputArea-mcOKLSnG.js";import{L as F}from"./LabelArea-0DWXq9HD.js";import{S as ke}from"./SwitchToggle-RSvpmGM0.js";import{a as U,n as $,I as Ce}from"./input-gQHjKdDm.js";import{h as q}from"./schemas-OC2HKR6e.js";import"./label-C8dAbglz.js";import{S as Le,a as Re,b as De,c as Ie,d as H}from"./select-BDRYY3xd.js";import{u as Be}from"./useToggleDrawer-CPe22eKR.js";import{A as Ee}from"./AnimatedContent-cp3-Y416.js";import{S as Te}from"./SectionTitle-BF1fOw86.js";import{T as Pe,B as Me}from"./ButtonGroup-DLxGcXp0.js";import{D as Q,a as Ae}from"./DynamicTableColumnHeader-B-Fm5i1_.js";import{D as Oe}from"./DynamicTableRowActions-DOQTnQUg.js";import{s as Ve}from"./selectColumn-CEkWKTWK.js";import{P as We}from"./pencil-17nNOU8I.js";import"./index-DDIj1pdZ.js";import"./ParentCategory--6rWT7Qf.js";import"./react-select.esm-CzjKpiua.js";import"./index-BuHubgKJ.js";import"./useAsync-D6kKTdcz.js";import"./ProductServices-DBTGWG86.js";import"./textarea-C_FOQh4B.js";import"./useDisableForDemo-CIf_heYM.js";import"./CouponServices-BRD7XHuS.js";import"./CurrencyServices-CIRQqBlM.js";import"./CampaignServices-BuQQ1Zcz.js";import"./index-DhMWD4mB.js";import"./spinner-BPU_yvxD.js";import"./AdminServices-Bj_CIE2n.js";import"./OrderServices-Cuav--fa.js";import"./DeliveryBoyServices-Dxlvwvi0.js";import"./index-Chjiymov.js";import"./SelectLanguageTwo-DsU1i0f-.js";import"./index.prod-BRHDaxhc.js";import"./table-BUiYTZlM.js";import"./no-result-Mqh4rCfd.js";const ze=[["path",{d:"M12 2v4",key:"3427ic"}],["path",{d:"m16.2 7.8 2.9-2.9",key:"r700ao"}],["path",{d:"M18 12h4",key:"wj9ykh"}],["path",{d:"m16.2 16.2 2.9 2.9",key:"1bxg5t"}],["path",{d:"M12 18v4",key:"jadmvz"}],["path",{d:"m4.9 19.1 2.9-2.9",key:"bwix9q"}],["path",{d:"M2 12h4",key:"j09sii"}],["path",{d:"m4.9 4.9 2.9 2.9",key:"giyufr"}]],Ue=le("loader",ze);function $e(a){var s={exports:{}};return a(s,s.exports),s.exports}$e(function(a){(function(){var s={}.hasOwnProperty;function t(){for(var n=[],l=0;l<arguments.length;l++){var r=arguments[l];if(r){var d=typeof r;if(d==="string"||d==="number")n.push(r);else if(Array.isArray(r)&&r.length){var u=t.apply(null,r);u&&n.push(u)}else if(d==="object")for(var p in r)s.call(r,p)&&r[p]&&n.push(p)}}return n.join(" ")}a.exports?(t.default=t,a.exports=t):window.classNames=t})()});function qe(a,s){s===void 0&&(s={});var t=s.insertAt;if(!(typeof document>"u")){var n=document.head||document.getElementsByTagName("head")[0],l=document.createElement("style");l.type="text/css",t==="top"&&n.firstChild?n.insertBefore(l,n.firstChild):n.appendChild(l),l.styleSheet?l.styleSheet.cssText=a:l.appendChild(document.createTextNode(a))}}var He=`.ReactFlagsSelect-module_flagsSelect__2pfa2 {
  position: relative;
  vertical-align: inherit;
  padding-bottom: 5px;
  text-align: left;
}

.ReactFlagsSelect-module_flagsSelectInline__cUnnz {
  display: inline-block;
}

.ReactFlagsSelect-module_selectBtn__19wW7 {
  cursor: pointer;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 10px;
  font-family: inherit;
  color: #4d4d4d;
  border: thin solid rgba(77, 77, 77, 0.3);
  border-radius: 4px;
  background: transparent;
}
.ReactFlagsSelect-module_selectBtn__19wW7:after, .ReactFlagsSelect-module_selectBtn__19wW7[aria-expanded=true]:after {
  content: " ";
  width: 0;
  height: 0;
  display: inline-block;
  margin-left: 5px;
}
.ReactFlagsSelect-module_selectBtn__19wW7:after {
  border-top: 5px solid #4d4d4d;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 0;
}
.ReactFlagsSelect-module_selectBtn__19wW7[aria-expanded=true]:after {
  border-top: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 5px solid #4d4d4d;
}

.ReactFlagsSelect-module_disabledBtn__3A4GF {
  background: #eaeaea;
  cursor: default;
}

.ReactFlagsSelect-module_label__27pw9, .ReactFlagsSelect-module_secondaryLabel__37t1D {
  font-size: 1em;
  padding-left: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ReactFlagsSelect-module_secondaryLabel__37t1D {
  color: #707070;
  padding-left: 5px;
}

.ReactFlagsSelect-module_selectValue__152eS,
.ReactFlagsSelect-module_selectOption__3pcgW {
  cursor: pointer;
  padding: 0 8px;
  margin: 4px 0;
  white-space: nowrap;
}

.ReactFlagsSelect-module_selectValue__152eS {
  pointer-events: none;
  display: flex;
  align-items: center;
}

.ReactFlagsSelect-module_selectOption__3pcgW {
  padding: 2px 18px;
}
.ReactFlagsSelect-module_selectOption__3pcgW:hover, .ReactFlagsSelect-module_selectOption__3pcgW:focus {
  outline: none;
  background: #eaeaea;
}

.ReactFlagsSelect-module_selectFlag__2q5gC {
  display: inline-flex;
  font-size: 1.2em;
}

.ReactFlagsSelect-module_selectOptionValue__vS99- {
  display: flex;
  align-items: center;
}

.ReactFlagsSelect-module_selectOptionWithlabel__2GpmM {
  padding: 4px 10px;
}

.ReactFlagsSelect-module_selectOptions__3LNBJ {
  position: absolute;
  z-index: 999999;
  border: 1px solid #bdbbbb;
  border-radius: 3px;
  background: #ffffff;
  margin-top: 8px;
  padding: 8px 0;
  max-height: 180px;
  overflow: auto;
}

.ReactFlagsSelect-module_selectOptionsWithSearch__1W03w {
  padding: 0 0 8px 0;
}

.ReactFlagsSelect-module_fullWidthOptions__1XeR6 {
  right: 0;
  left: 0;
}

.ReactFlagsSelect-module_alignOptionsToRight__3Qvq2 {
  right: 0;
}

.ReactFlagsSelect-module_filterBox__3m8EU {
  position: sticky;
  top: 0;
  width: 100%;
  padding-top: 8px;
  background: #ffffff;
}
.ReactFlagsSelect-module_filterBox__3m8EU input {
  width: calc(100% - 20px);
  margin: 0 10px;
  padding: 8px;
  box-sizing: border-box;
}
.ReactFlagsSelect-module_filterBox__3m8EU input:focus {
  outline: none;
}`;qe(He);const Qe=a=>{const[s,t]=c.useState(!1),{setIsUpdate:n}=c.useContext(re),{openDrawer:l,closeDrawer:r}=K(),d=oe(),u=be({defaultValues:{name:"",code:"",flag:"",status:!0}}),{control:p,register:x,setValue:i,clearErrors:g,setError:h,handleSubmit:b,formState:{errors:k}}=u,C=async({name:f,code:S,flag:j,status:m})=>{try{t(!0);const _={name:f,code:S,flag:j,status:m?"show":"hide"};if(a){const v=await w.updateLanguage(a,_);n(!0),t(!1),$(v.message),r(),d.invalidateQueries(["languages"])}else{const v=await w.addLanguage(_);n(!0),t(!1),$(v.message),r(),d.invalidateQueries(["languages"])}}catch(_){t(!1),q(_,h,U)}};return c.useEffect(()=>{if(!a){i("name"),i("code"),i("flag"),g("name"),g("code"),g("flag"),g("status");return}},[a,i,l,g]),c.useEffect(()=>{a&&(async()=>{try{const f=await w.getLanguageById(a);f&&(i("name",f.name),i("code",f.code),i("flag",f.flag),i("status",f.status==="show"))}catch(f){q(f,h,U)}})()},[a]),{form:u,control:p,onSubmit:C,register:x,errors:k,setValue:i,handleSubmit:b,isSubmitting:s}},Je=Se,X=c.createContext({}),I=({...a})=>e.jsx(X.Provider,{value:{name:a.name},children:e.jsx(je,{...a})}),Y=()=>{const a=c.useContext(X),s=c.useContext(Z),{getFieldState:t}=ye(),n=Fe({name:a.name}),l=t(a.name,n);if(!a)throw new Error("useFormField should be used within <FormField>");const{id:r}=s;return{id:r,name:a.name,formItemId:`${r}-form-item`,formDescriptionId:`${r}-form-item-description`,formMessageId:`${r}-form-item-message`,...l}},Z=c.createContext();function B({className:a,...s}){const t=c.useId();return e.jsx(Z.Provider,{value:{id:t},children:e.jsx("div",{"data-slot":"form-item",className:T("grid gap-2",a),...s})})}function N({...a}){const{error:s,formItemId:t,formDescriptionId:n,formMessageId:l}=Y();return e.jsx(ie,{"data-slot":"form-control",id:t,"aria-describedby":s?`${n} ${l}`:`${n}`,"aria-invalid":!!s,...a})}function E({className:a,...s}){const{error:t,formMessageId:n}=Y(),l=t?String(t?.message??""):s.children;return l?e.jsx("p",{"data-slot":"form-message",id:n,className:T("text-destructive text-sm",a),...s,children:l}):null}function Ke({value:a,onValueChange:s,isPending:t,items:n,placeholder:l,disabled:r,className:d=""}){return e.jsxs(Le,{value:a,onValueChange:s,disabled:r,children:[e.jsx(N,{children:e.jsx(Re,{className:T(d),children:e.jsx(De,{placeholder:l??"Select"})})}),e.jsx(Ie,{position:"popper",container:document.querySelector(".drawer-container"),className:"z-[9999]",children:t?e.jsx(H,{disabled:!0,value:"loading",className:"h-14",children:e.jsxs("div",{className:"flex items-center justify-center gap-2",children:[e.jsx(Ue,{className:"h-5 w-5 animate-spin"}),"Loading..."]})}):n?.map(u=>e.jsx(H,{value:u.value,children:u.label},u.value))})]})}const J=[{name:"English",code:"en",native_name:"English",flag:"🇬🇧",rtl:!1},{name:"বাংলা",code:"bn",native_name:"বাংলা",flag:"🇧🇩",rtl:!1},{name:"العربية",code:"ar",native_name:"العربية",flag:"🇸🇦",rtl:!0},{name:"Español",code:"es",native_name:"Español",flag:"🇪🇸",rtl:!1},{name:"Français",code:"fr",native_name:"Français",flag:"🇫🇷",rtl:!1},{name:"Deutsch",code:"de",native_name:"Deutsch",flag:"🇩🇪",rtl:!1},{name:"中文",code:"zh",native_name:"中文",flag:"🇨🇳",rtl:!1},{name:"Русский",code:"ru",native_name:"Русский",flag:"🇷🇺",rtl:!1},{name:"Português",code:"pt",native_name:"Português",flag:"🇵🇹",rtl:!1},{name:"日本語",code:"ja",native_name:"日本語",flag:"🇯🇵",rtl:!1},{name:"हिन्दी",code:"hi",native_name:"हिन्दी",flag:"🇮🇳",rtl:!1},{name:"اردو",code:"ur",native_name:"اردو",flag:"🇵🇰",rtl:!0},{name:"ਪੰਜਾਬੀ",code:"pa",native_name:"ਪੰਜਾਬੀ",flag:"🇮🇳",rtl:!1},{name:"தமிழ்",code:"ta",native_name:"தமிழ்",flag:"🇮🇳",rtl:!1},{name:"Türkçe",code:"tr",native_name:"Türkçe",flag:"🇹🇷",rtl:!1},{name:"한국어",code:"ko",native_name:"한국어",flag:"🇰🇷",rtl:!1},{name:"Italiano",code:"it",native_name:"Italiano",flag:"🇮🇹",rtl:!1},{name:"Nederlands",code:"nl",native_name:"Nederlands",flag:"🇳🇱",rtl:!1},{name:"Polski",code:"pl",native_name:"Polski",flag:"🇵🇱",rtl:!1},{name:"Українська",code:"uk",native_name:"Українська",flag:"🇺🇦",rtl:!1},{name:"Tiếng Việt",code:"vi",native_name:"Tiếng Việt",flag:"🇻🇳",rtl:!1},{name:"ไทย",code:"th",native_name:"ไทย",flag:"🇹🇭",rtl:!1},{name:"فارسی",code:"fa",native_name:"فارسی",flag:"🇮🇷",rtl:!0},{name:"Bahasa Melayu",code:"ms",native_name:"Bahasa Melayu",flag:"🇲🇾",rtl:!1},{name:"Bahasa Indonesia",code:"id",native_name:"Bahasa Indonesia",flag:"🇮🇩",rtl:!1},{name:"עברית",code:"he",native_name:"עברית",flag:"🇮🇱",rtl:!0},{name:"Čeština",code:"cs",native_name:"Čeština",flag:"🇨🇿",rtl:!1},{name:"Svenska",code:"sv",native_name:"Svenska",flag:"🇸🇪",rtl:!1},{name:"Magyar",code:"hu",native_name:"Magyar",flag:"🇭🇺",rtl:!1},{name:"Suomi",code:"fi",native_name:"Suomi",flag:"🇫🇮",rtl:!1},{name:"Dansk",code:"da",native_name:"Dansk",flag:"🇩🇰",rtl:!1},{name:"Norsk",code:"no",native_name:"Norsk",flag:"🇳🇴",rtl:!1},{name:"Română",code:"ro",native_name:"Română",flag:"🇷🇴",rtl:!1},{name:"Српски",code:"sr",native_name:"Српски",flag:"🇷🇸",rtl:!1},{name:"Slovenčina",code:"sk",native_name:"Slovenčina",flag:"🇸🇰",rtl:!1},{name:"Hrvatski",code:"hr",native_name:"Hrvatski",flag:"🇭🇷",rtl:!1},{name:"Български",code:"bg",native_name:"Български",flag:"🇧🇬",rtl:!1},{name:"Ελληνικά",code:"el",native_name:"Ελληνικά",flag:"🇬🇷",rtl:!1},{name:"ქართული",code:"ka",native_name:"ქართული",flag:"🇬🇪",rtl:!1},{name:"አማርኛ",code:"am",native_name:"አማርኛ",flag:"🇪🇹",rtl:!1},{name:"नेपाली",code:"ne",native_name:"नेपाली",flag:"🇳🇵",rtl:!1},{name:"සිංහල",code:"si",native_name:"සිංහල",flag:"🇱🇰",rtl:!1},{name:"ភាសាខ្មែរ",code:"km",native_name:"ភាសាខ្មែរ",flag:"🇰🇭",rtl:!1},{name:"ລາວ",code:"lo",native_name:"ລາວ",flag:"🇱🇦",rtl:!1},{name:"မြန်မာ",code:"my",native_name:"မြန်မာ",flag:"🇲🇲",rtl:!1},{name:"Jawa",code:"jw",native_name:"Jawa",flag:"🇮🇩",rtl:!1},{name:"Basa Sunda",code:"su",native_name:"Basa Sunda",flag:"🇮🇩",rtl:!1},{name:"Tagalog",code:"tl",native_name:"Tagalog",flag:"🇵🇭",rtl:!1},{name:"Монгол",code:"mn",native_name:"Монгол",flag:"🇲🇳",rtl:!1},{name:"བོད་སྐད་",code:"bo",native_name:"བོད་སྐད་",flag:"🇨🇳",rtl:!1}],Ge=({id:a})=>{const{form:s,control:t,onSubmit:n,register:l,errors:r,setValue:d,handleSubmit:u,isSubmitting:p}=Qe(a),{t:x}=G();return e.jsxs("div",{className:"flex flex-col h-full",children:[e.jsx("div",{className:"w-full relative px-6 py-4 border-b bg-muted",children:a?e.jsx(z,{title:x("UpdateLanguage"),description:x("UpdateLanguageText")}):e.jsx(z,{title:x("AddLanguage"),description:x("AddLanguageText")})}),e.jsx(Je,{...s,children:e.jsxs("form",{id:"language-form",onSubmit:u(n),className:"flex flex-col flex-1 overflow-hidden",children:[e.jsx(he.Scrollbars,{className:"flex-1 mb-8",children:e.jsxs("div",{className:"p-6 pb-6 flex-grow scrollbar-hide w-full max-h-full",children:[e.jsxs("div",{className:"grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6 relative",children:[e.jsx(F,{label:"Select Language"}),e.jsx("div",{className:"col-span-8 sm:col-span-4",children:e.jsx(I,{control:t,name:"code",render:({field:i})=>e.jsxs(B,{children:[e.jsx("div",{className:"flex items-center gap-4",children:e.jsx(N,{children:e.jsx(Ke,{items:J.map(g=>({label:`${g.flag} ${g.name} (${g.code})`,value:g.code})),value:i.value,defaultValue:i.value,onValueChange:g=>{const h=J.find(b=>b.code===g);h&&(d("code",h.code),d("name",h.name),d("flag",h.flag))},placeholder:"Select language",className:"w-full"})})}),e.jsx(E,{className:"ml-[130px]"})]})})})]}),e.jsxs("div",{className:"grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6",children:[e.jsx(F,{label:x("AddLanguageName")}),e.jsxs("div",{className:"col-span-8 sm:col-span-4",children:[e.jsx(Ne,{name:"name",type:"text",required:!0,register:l,label:"Language name",placeholder:"Language name"}),e.jsx(we,{errorName:r.name})]})]}),e.jsxs("div",{className:"grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6",children:[e.jsx(F,{label:"Flag"}),e.jsx("div",{className:"col-span-8 sm:col-span-4",children:e.jsx(I,{control:t,name:"flag",render:({field:i})=>e.jsxs(B,{children:[e.jsx("div",{className:"flex items-center gap-4",children:e.jsx(N,{children:e.jsx(Ce,{placeholder:"Emoji or URL",...i})})}),e.jsx(E,{className:"ml-[130px]"})]})})})]}),e.jsxs("div",{className:"grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6",children:[e.jsx(F,{label:"Published"}),e.jsx("div",{className:"col-span-8 sm:col-span-4",children:e.jsx(I,{control:t,name:"status",render:({field:i})=>e.jsxs(B,{children:[e.jsx("div",{className:"flex items-center gap-4",children:e.jsx(N,{children:e.jsx(ke,{title:"",handleProcess:i.onChange,processOption:i?.value})})}),e.jsx(E,{className:"ml-[130px]"})]})})})]})]})}),e.jsx(ve,{id:a,title:"Language",isSubmitting:p})]})})]})},Va=()=>{const{open:a,setOpen:s,selectedId:t,selectedIds:n,setSelectedIds:l,toggleDrawer:r}=K(),[d,u]=c.useState([]),[p,x]=c.useState({}),[i,g]=c.useState([]),[h,b]=c.useState({}),{title:k,handleDeleteMany:C,handleUpdateMany:f,handleUpdate:S,handleModalOpen:j}=Be(),{t:m}=G(),[_,v]=c.useState(1),[y,ee]=c.useState(20),[L,P]=c.useState(""),[R,M]=c.useState(""),A=d[0]?.id||"",O=d[0]?d[0].desc?"desc":"asc":"",{data:V,isLoading:ae,error:Xe}=ce({queryKey:["languages",_,y,L,R,A,O],queryFn:()=>w.getAllLanguages({page:_,limit:y,search:L||void 0,status:R||void 0,sortBy:A||void 0,sortOrder:O||void 0}),staleTime:600*1e3,gcTime:900*1e3,placeholderData:de}),ne=V?.languages||[],W=V?.totalDoc||0,te=c.useCallback(()=>{P(""),M(""),v(1)},[]),se=c.useMemo(()=>[Ve,{accessorKey:"name",header:({column:o})=>e.jsx(Q,{column:o,title:m("LanguagesNname")}),cell:({row:o})=>e.jsx("span",{className:"text-sm",children:o.original.name}),enableSorting:!0},{accessorKey:"code",header:({column:o})=>e.jsx(Q,{column:o,title:m("LanguagesIsoCode")}),cell:({row:o})=>e.jsx("span",{className:"text-sm",children:o.original.code}),enableSorting:!0},{accessorKey:"flag",header:m("LanguagesFlag"),cell:({row:o})=>e.jsx("span",{children:o.original?.flag}),enableSorting:!1},{id:"published",header:()=>e.jsx("span",{className:"text-center block",children:m("LanguagesPublished")}),cell:({row:o})=>e.jsx("div",{className:"text-center",children:e.jsx(fe,{id:o.original._id,status:o.original.status})}),enableSorting:!1},{id:"actions",header:()=>e.jsx("span",{className:"text-right block",children:m("LanguagesActions")}),cell:({row:o})=>e.jsx(Oe,{row:o,actions:[{key:"edit",label:m("Edit"),icon:We,onClick:()=>S(o.original._id)},{separator:!0},{key:"delete",label:m("Delete"),icon:Pe,variant:"delete",onClick:()=>j(o.original._id,o.original.name)}]}),enableSorting:!1,enableHiding:!1}],[m,S,j]);return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"flex items-center justify-between py-4 lg:py-8 flex-wrap",children:[e.jsx(Te,{title:m("SidebarLanguages"),description:m("LanguagesPageDesc")}),e.jsxs(Me,{children:[e.jsxs(D,{disabled:n.length<1,onClick:()=>f(n),variant:"bulkAction",children:[e.jsx(me,{className:"mr-1"}),m("BulkAction")]}),e.jsxs(D,{disabled:n.length<1,onClick:()=>C(n,m("Selected")+" "+m("Languages")),variant:"delete",children:[e.jsx(ge,{className:"mr-1"}),m("Delete")]}),e.jsxs(D,{onClick:r,variant:"create",children:[e.jsx(ue,{className:"mr-1"}),"Add language"]})]})]}),e.jsx(_e,{children:e.jsx(Ge,{id:t})}),e.jsx(pe,{ids:n,title:"Languages"}),e.jsx(xe,{open:a,title:k,id:t,onOpenChange:()=>s(!1),ids:n?.length>0?n:null}),e.jsx(Ee,{children:e.jsx(Ae,{data:ne,columns:se,loading:ae,serverSide:!0,searchText:L,onSearchChange:o=>{P(o),v(1)},searchPlaceholder:"Search by name or code...",filters:[{title:"Published",options:[{label:"Published",value:"show"},{label:"Unpublished",value:"hide"}],value:R,onChange:o=>{M(o),v(1)}}],onReset:te,sorting:d,setSorting:u,rowSelection:p,setRowSelection:x,setSelectedIds:l,columnFilters:i,setColumnFilters:g,columnVisibility:h,setColumnVisibility:b,totalCount:W,totalPages:Math.ceil(W/y)||1,currentPage:_,pageSize:y,onPageChange:v,onPageSizeChange:o=>{ee(o),v(1)}})})]})};export{Va as default};
