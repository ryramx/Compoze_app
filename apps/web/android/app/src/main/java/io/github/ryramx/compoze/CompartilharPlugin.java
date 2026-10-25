package io.github.ryramx.compoze;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * "Compartilhar para o Compoze" (Fase 3b). Recebe o texto que outro app manda
 * pelo menu de compartilhar do Android e entrega ao app web no evento
 * "recebido" (lib/nativo.ts), que cria uma canção nova com ele.
 */
@CapacitorPlugin(name = "Compartilhar")
public class CompartilharPlugin extends Plugin {

    @Override
    public void load() {
        // O compartilhamento que abriu o app chega antes do JS ouvir; o
        // evento fica guardado até o primeiro ouvinte.
        tratar(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        tratar(intent);
    }

    private void tratar(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
        String tipo = intent.getType();
        if (tipo == null || !tipo.startsWith("text/")) return;
        CharSequence texto = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
        if (texto == null || texto.toString().trim().isEmpty()) return;

        JSObject dados = new JSObject();
        dados.put("texto", texto.toString());
        String assunto = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        if (assunto != null) dados.put("titulo", assunto);
        notifyListeners("recebido", dados, true);

        // Se o Android recriar a activity (o app voltou depois de o sistema
        // fechá-lo por memória), ela recebe o mesmo intent; sem isto, a mesma
        // ideia viraria duas canções.
        intent.setAction(Intent.ACTION_MAIN);
        intent.removeExtra(Intent.EXTRA_TEXT);
    }
}
