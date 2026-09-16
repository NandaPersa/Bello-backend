-- 01-init.sql
\c bello_db;

DO $$
DECLARE
    module_name text;
    modules text[] := ARRAY[
        'identity',
        'professional_catalog',
        'discovery',
        'scheduling',
        'client_records',
        'reviews',
        'billing',
        'payments',
        'marketing',
        'notifications',
        'analytics',
        'admin'
    ];
BEGIN
    FOREACH module_name IN ARRAY modules
    LOOP
        -- Cria o usuário para o módulo (senha igual ao nome_user para ambiente local)
        EXECUTE format('CREATE USER %I_user WITH PASSWORD ''%I_pass'';', module_name, module_name);
        
        -- Cria o schema de propriedade do usuário recém-criado
        EXECUTE format('CREATE SCHEMA %I AUTHORIZATION %I_user;', module_name, module_name);
        
        -- Revoga qualquer acesso público ao schema (ninguém além do dono e admin acessa)
        EXECUTE format('REVOKE ALL ON SCHEMA %I FROM PUBLIC;', module_name);
        
        -- Garante que o usuário do módulo tenha controle total sobre seu schema
        EXECUTE format('GRANT ALL ON SCHEMA %I TO %I_user;', module_name, module_name);
        
        -- Garante que todas as tabelas criadas no futuro concedam permissões corretas
        EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I_user IN SCHEMA %I GRANT ALL ON TABLES TO %I_user;', module_name, module_name, module_name);
        EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I_user IN SCHEMA %I GRANT ALL ON SEQUENCES TO %I_user;', module_name, module_name, module_name);
    END LOOP;
END
$$;
