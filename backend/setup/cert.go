package setup

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math/big"
	"os"
	"time"
)

const (
	keyFile  = "/app/etc/nginx/ssl/panda-wiki.key" // Key file path
	certFile = "/app/etc/nginx/ssl/panda-wiki.crt" // Certificate file path
)

// CheckInitCert makes sure the self-signed certificate the bundled admin nginx
// reads through a shared volume exists.
//
// Whether to call this at all is the caller's decision, so that the entrypoints
// which build on this package keep compiling unchanged: see setup.init_cert in
// cmd/api.
func CheckInitCert() error {
	// Check both key and cert files
	keyExists := false
	certExists := false

	if _, err := os.Stat(keyFile); err == nil {
		keyExists = true
	}

	if _, err := os.Stat(certFile); err == nil {
		certExists = true
	}

	// If either file is missing, recreate both
	if !keyExists || !certExists {
		return createSelfSignedCerts()
	}

	return nil
}

func createSelfSignedCerts() error {
	// Generate RSA private key
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return fmt.Errorf("failed to generate private key: %v", err)
	}

	// Create certificate template
	template := x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject: pkix.Name{
			CommonName: "pandawiki.docs.baizhi.cloud",
		},
		NotBefore:             time.Now(),
		NotAfter:              time.Now().AddDate(10, 0, 0), // Certificate valid for 10 year
		IsCA:                  true,
		BasicConstraintsValid: true,
		KeyUsage:              x509.KeyUsageCertSign | x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		DNSNames:              []string{"pandawiki.docs.baizhi.cloud"},
	}

	// Sign certificate with private key
	certBytes, err := x509.CreateCertificate(rand.Reader, &template, &template, privateKey.Public(), privateKey)
	if err != nil {
		return fmt.Errorf("failed to create certificate: %v", err)
	}

	// ensure dir /app/etc/nginx/ssl exists
	if err := os.MkdirAll("/app/etc/nginx/ssl", 0o755); err != nil {
		return fmt.Errorf("failed to create ssl dir: %v", err)
	}

	// Write certificate file with appropriate permissions
	certFile, err := os.Create("/app/etc/nginx/ssl/panda-wiki.crt")
	if err != nil {
		return fmt.Errorf("failed to create cert file: %v", err)
	}
	defer certFile.Close()

	// Set certificate file permissions to 644 (readable by all)
	if err := certFile.Chmod(0o644); err != nil {
		return fmt.Errorf("failed to set cert file permissions: %v", err)
	}

	err = pem.Encode(certFile, &pem.Block{Type: "CERTIFICATE", Bytes: certBytes})
	if err != nil {
		return fmt.Errorf("failed to encode certificate: %v", err)
	}

	// Write private key file with appropriate permissions
	keyFile, err := os.Create("/app/etc/nginx/ssl/panda-wiki.key")
	if err != nil {
		return fmt.Errorf("failed to create key file: %v", err)
	}
	defer keyFile.Close()

	// Set private key file permissions to 600 (owner read/write)
	if err := keyFile.Chmod(0o600); err != nil {
		return fmt.Errorf("failed to set key file permissions: %v", err)
	}

	err = pem.Encode(keyFile, &pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(privateKey)})
	if err != nil {
		return fmt.Errorf("failed to encode private key: %v", err)
	}

	return nil
}
