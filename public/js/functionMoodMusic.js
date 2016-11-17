/**
 * Created by hadrien1 on 17/11/16.
 */

// Fonction qui retourne la moyenne des éléments du tableau
function moyenne(tab) {
    var somme = 0;
    for (var i = 0, j = tab.length; i < j; i++) {
        somme += parseFloat(tab[i]);
    }
    console.log (tab);
    return((somme / tab.length).toFixed(4));
}