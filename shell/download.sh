#!/usr/bin/env bash
set -e
[[ ! "${1}" ]] && echo "Usage: download.sh [slug]" && exit 1
localip=$(hostname -I | awk '{print $1}')
rootpath="/home/files"
slug=${1}
linkapi="http://127.0.0.1:8888/download/data?slug=${slug}"
call_data=$(curl -sS "$linkapi")
status=$(echo $call_data | jq -r '.status')
quality=$(echo $call_data | jq -r '.quality[]')

if [[ "$status" == "false" ]]; then
	echo "exit"
	exit 1
fi

for files in ${quality[@]}; do
	echo $files
	link_data="${linkapi}&quality=$files"
	call=$(curl -sS "$link_data")
	lst=$(echo $call | jq -r '.status')

	if [[ "$lst" == "false" ]]; then
		echo $lst
	else
		token=$(echo $call | jq -r '.data.token')

		title=$(echo $call | jq -r '.data.quality')
		backup=$(echo $call | jq -r '.data.backup')
		quality=$(echo $call | jq -r '.data.quality')

		save_path=${rootpath}/${token}

		#gdrive info
		gdrive_api="http://127.0.0.1:8888/gdrive/info?gid=${backup}"
		gdrive_data=$(curl -sS "$gdrive_api")
		gdrive_status=$(echo $gdrive_data | jq -r '.status')

		if [[  "$gdrive_status" == "false" ]]; then
			echo $gdrive_status
		else
			gdrive_name=$(echo $gdrive_data | jq -r '.data.Name')
			gdrive_ext=$(echo $gdrive_data | jq -r '.data.ext')

			mkdir -p ${save_path}
			chmod 0777 ${save_path}

			tmp_file=${save_path}/${gdrive_name}
			tmp_download=${save_path}/download.txt
			file_save=${save_path}/file_${title}.${gdrive_ext}

			if [[ -f "$tmp_download" ]]; then
				rm -rf ${tmp_download}
			fi
			if [[ -f "$tmp_file" ]]; then
				rm -rf ${tmp_file}
			fi
			if [[ -f "$file_save" ]]; then
				rm -rf ${file_save}
			fi

			cd ${save_path} && gdrive download ${backup} >> ${tmp_download} 2>&1

			sleep 1
			mv ${tmp_file} ${file_save}
			sudo rm -rf ${tmp_download}
			curl -sS "http://127.0.0.1:8888/download/done?slug=${slug}&quality=${quality}&token=${token}"
			sleep 3
		fi
	fi

done

curl -sS "http://127.0.0.1:8888/download/done?slug=${slug}"
sleep 3
bash /home/node/shell/update-disk.sh > /dev/null &
sleep 2
#curl -sS "http://127.0.0.1:8888/download/start?sv_ip=${localip}"
exit 1