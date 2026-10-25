package io.github.ryramx.compoze;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins do próprio app, antes de o Capacitor subir.
        registerPlugin(CompartilharPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
