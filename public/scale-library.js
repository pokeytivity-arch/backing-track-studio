/* scale-library.js: the scales Pokey teaches, in one place. Used by the Scale room and the 90 Day plan builder.
   deg = scale degrees against the major scale (b = flat, # = sharp). keys = the only keys this scale is taught in (omitted = all keys). */
(function(){
'use strict';
const L=[], add=(fam,grp,id,rid,name,deg,keys)=>L.push({fam,grp,id,rid:rid||id.replace(/^sc\./,''),name,deg,keys:keys||null});
/* ---- Regular scales ---- */
add('regular','Diatonic','sc.major','major','Natural major','1 2 3 4 5 6 7');
add('regular','Diatonic','sc.nminor','nat','Natural minor','1 2 b3 4 5 b6 b7');
add('regular','Diatonic','sc.hmin','harm','Harmonic minor','1 2 b3 4 5 b6 7');
add('regular','Diatonic','sc.mmin','mel','Melodic minor','1 2 b3 4 5 6 7');
add('regular','Hexatonic','sc.hexn7','hexn7','Major hexatonic (no 7)','1 2 3 4 5 6');
add('regular','Hexatonic','sc.hexn4','hexn4','Major hexatonic (no 4)','1 2 3 5 6 7');
add('regular','Pentatonic','sc.pmaj','pmaj','Major pentatonic','1 2 3 5 6');
add('regular','Pentatonic','sc.pmin','pmin','Minor pentatonic','1 b3 4 5 b7');
add('regular','Pentatonic','sc.pmajb','pmajb','Major pentatonic blues','1 2 b3 3 5 6');
add('regular','Pentatonic','sc.pminb','pminb','Minor pentatonic blues','1 b3 4 b5 5 b7');
add('regular','Four note scales','sc.p4n3','p4n3','Minor pentatonic (no 3)','1 4 5 b7');
add('regular','Four note scales','sc.p4n5','p4n5','Minor pentatonic (no 5)','1 b3 4 b7');
/* ---- Exotic scales ---- */
add('exotic','Authentic modes (modes of the major scale)','sc.ion','ion','Ionian','1 2 3 4 5 6 7');
add('exotic','Authentic modes (modes of the major scale)','sc.dor','dor','Dorian','1 2 b3 4 5 6 b7');
add('exotic','Authentic modes (modes of the major scale)','sc.phr','phr','Phrygian','1 b2 b3 4 5 b6 b7');
add('exotic','Authentic modes (modes of the major scale)','sc.lyd','lyd','Lydian','1 2 3 #4 5 6 7');
add('exotic','Authentic modes (modes of the major scale)','sc.mix','mix','Mixolydian','1 2 3 4 5 6 b7');
add('exotic','Authentic modes (modes of the major scale)','sc.aeo','aeo','Aeolian','1 2 b3 4 5 b6 b7');
add('exotic','Authentic modes (modes of the major scale)','sc.loc','loc','Locrian','1 b2 b3 4 b5 b6 b7');
add('exotic','Synthetic modes: harmonic minor (modes 2 to 7)','sc.hm2','hm2','Locrian ♮6','1 b2 b3 4 b5 6 b7');
add('exotic','Synthetic modes: harmonic minor (modes 2 to 7)','sc.hm3','hm3','Ionian ♯5','1 2 3 4 #5 6 7');
add('exotic','Synthetic modes: harmonic minor (modes 2 to 7)','sc.ukd','hm4','Ukrainian Dorian (Dorian ♯4)','1 2 b3 #4 5 6 b7');
add('exotic','Synthetic modes: harmonic minor (modes 2 to 7)','sc.sph','hm5','Spanish Phrygian (Phrygian dominant)','1 b2 3 4 5 b6 b7');
add('exotic','Synthetic modes: harmonic minor (modes 2 to 7)','sc.hm6','hm6','Lydian ♯2','1 #2 3 #4 5 6 7');
add('exotic','Synthetic modes: harmonic minor (modes 2 to 7)','sc.hm7','hm7','Super Locrian ♭♭7','1 b2 b3 b4 b5 b6 bb7');
add('exotic','Synthetic modes: melodic minor (modes 2 to 7)','sc.mm2','dorb2','Dorian ♭2','1 b2 b3 4 5 6 b7');
add('exotic','Synthetic modes: melodic minor (modes 2 to 7)','sc.mm3','lydaug','Lydian augmented','1 2 3 #4 #5 6 7');
add('exotic','Synthetic modes: melodic minor (modes 2 to 7)','sc.lyd7','lyddom','Lydian dominant','1 2 3 #4 5 6 b7');
add('exotic','Synthetic modes: melodic minor (modes 2 to 7)','sc.mixb6','mixb6','Mixolydian ♭6','1 2 3 4 5 b6 b7');
add('exotic','Synthetic modes: melodic minor (modes 2 to 7)','sc.mm6','mm6','Locrian ♮2','1 2 b3 4 b5 b6 b7');
add('exotic','Synthetic modes: melodic minor (modes 2 to 7)','sc.sloc','super','Super Locrian','1 b2 b3 b4 b5 b6 b7');
add('exotic','Symmetrical scales','sc.chr','chr','Chromatic scale','1 b2 2 b3 3 4 #4 5 b6 6 b7 7',['C']);
add('exotic','Symmetrical scales','sc.wt','wt','Whole tone scale','1 2 3 #4 #5 b7',['C','Db']);
add('exotic','Symmetrical scales','sc.oct1','oct1','Octatonic whole-half','1 2 b3 4 b5 b6 6 7',['C','Db','D']);
add('exotic','Symmetrical scales','sc.oct2','oct2','Octatonic half-whole','1 b2 b3 3 #4 5 6 b7',['C','Db','D']);
add('exotic','Symmetrical scales','sc.aug13','aug13','Augmented scale 1+3','1 b2 3 4 #5 6',['C','Db','D','Eb']);
add('exotic','Symmetrical scales','sc.aug31','aug31','Augmented scale 3+1','1 b3 3 5 b6 7',['C','Db','D','Eb']);
window.SCALELIB={list:L,byId:id=>L.find(x=>x.id===id)||null,families:['regular','exotic']};
})();
