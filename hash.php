<?php
$plain = '117546JuA';
echo password_hash($plain, PASSWORD_BCRYPT, ['cost' => 10]);
?>
